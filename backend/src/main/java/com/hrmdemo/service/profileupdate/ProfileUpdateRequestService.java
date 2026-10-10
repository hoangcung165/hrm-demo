package com.hrmdemo.service.profileupdate;

import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.dto.approval.ApprovalRequestResponse;
import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.employee.ContactField;
import com.hrmdemo.dto.employee.EmployeeContact;
import com.hrmdemo.dto.profileupdate.ProfileUpdateChange;
import com.hrmdemo.dto.profileupdate.ProfileUpdateResponse;
import com.hrmdemo.dto.profileupdate.ProfileUpdateSubmitRequest;
import com.hrmdemo.entity.profileupdate.ProfileUpdateRequest;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.profileupdate.ProfileUpdateRequestRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.approval.ApprovalEvent;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.employee.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cập nhật hồ sơ, the first type of Yêu cầu phê duyệt: an Employee proposes new contact fields for their own
 * profile, and the profile takes them only when the last level approves (an approver or Tự duyệt). Reject, return
 * and cancel leave it as it is. One open request per Employee at a time.
 */
@Service
@RequiredArgsConstructor
public class ProfileUpdateRequestService {

    private static final Map<ContactField, String> LABELS = Map.of(
            ContactField.PERSONAL_EMAIL, "Email cá nhân",
            ContactField.PHONE, "Số điện thoại",
            ContactField.ADDRESS, "Địa chỉ",
            ContactField.EMERGENCY_CONTACT_NAME, "Người liên hệ khẩn cấp",
            ContactField.EMERGENCY_CONTACT_RELATIONSHIP, "Người liên hệ khẩn cấp",
            ContactField.EMERGENCY_CONTACT_PHONE, "Người liên hệ khẩn cấp");

    private final ProfileUpdateRequestRepository profileUpdates;
    private final ApprovalRequestService approvals;
    private final EmployeeService employees;
    private final Clock clock;

    /** Sends the caller's changes for approval; the caller's own profile only. */
    @Transactional
    public ProfileUpdateResponse submit(CurrentAccount caller, ProfileUpdateSubmitRequest request) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        approvals.openRequestOf(me, ApprovalRequestType.PROFILE_UPDATE).ifPresent(open -> {
            throw new ApiException(HttpStatus.CONFLICT, "profile_update.already_open",
                    "A profile update of yours is still waiting or returned to you").with("requestId", open);
        });
        List<ProfileUpdateRequest.Change> changes = changes(me, request);
        UUID id = approvals.submit(me, ApprovalRequestType.PROFILE_UPDATE, null, summary(changes));
        ProfileUpdateRequest saved = profileUpdates.save(
                new ProfileUpdateRequest(id, me, note(request), changes, clock.instant()));
        return response(saved, approvals.get(caller, id));
    }

    /** The content of a request, for whoever may open the request itself. */
    @Transactional(readOnly = true)
    public ProfileUpdateResponse get(CurrentAccount caller, UUID id) {
        ApprovalRequestResponse approval = approvals.get(caller, id);
        return response(find(id), approval);
    }

    /** Sửa và gửi lại: the sender's new proposal for a request returned to them, sent again at the same level. */
    @Transactional
    public ProfileUpdateResponse resubmit(CurrentAccount caller, UUID id, ProfileUpdateSubmitRequest request) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        ProfileUpdateRequest profileUpdate = find(id);
        if (!profileUpdate.getEmployeeId().equals(me)) {
            approvals.get(caller, id); // 404 when not involved
            throw new ApiException(HttpStatus.FORBIDDEN, "approval.not_sender", "Only the sender sends it again");
        }
        List<ProfileUpdateRequest.Change> changes = changes(me, request);
        ApprovalRequestResponse approval = approvals.resubmit(caller, id, note(request), summary(changes));
        profileUpdate.replace(note(request), changes, clock.instant());
        return response(profileUpdate, approval);
    }

    /** The last level approved: the profile takes the proposed values, in the approval's transaction. */
    @EventListener
    void onApproved(ApprovalEvent event) {
        if (event.type() != ApprovalEvent.Type.APPROVED
                || event.requestType() != ApprovalRequestType.PROFILE_UPDATE) {
            return;
        }
        // A request sent without content (only possible from code, e.g. engine tests) has nothing to apply.
        profileUpdates.findById(event.requestId()).ifPresent(profileUpdate -> {
            Map<ContactField, String> values = new EnumMap<>(ContactField.class);
            profileUpdate.getChanges()
                    .forEach(c -> values.put(ContactField.valueOf(c.getField()), c.getNewValue()));
            employees.applyContactChanges(profileUpdate.getEmployeeId(), values);
        });
    }

    private List<ProfileUpdateRequest.Change> changes(UUID me, ProfileUpdateSubmitRequest request) {
        EmployeeContact current = employees.contactOf(me);
        EmployeeContact proposed = employees.checkContact(me, request.personalEmail(), request.phone(),
                request.address(), request.emergencyContact());
        List<ProfileUpdateRequest.Change> changes = new ArrayList<>();
        for (ContactField field : ContactField.values()) {
            if (!Objects.equals(current.get(field), proposed.get(field))) {
                changes.add(new ProfileUpdateRequest.Change(field.name(), current.get(field), proposed.get(field)));
            }
        }
        if (changes.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "profile_update.no_change",
                    "Nothing differs from the profile");
        }
        return changes;
    }

    /** The changed fields for lists and notifications, e.g. "Số điện thoại, địa chỉ". */
    static String summary(List<ProfileUpdateRequest.Change> changes) {
        Set<String> labels = changes.stream().map(c -> LABELS.get(ContactField.valueOf(c.getField())))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<String> parts = new ArrayList<>();
        for (String label : labels) {
            parts.add(parts.isEmpty() ? label : label.substring(0, 1).toLowerCase(Locale.ROOT) + label.substring(1));
        }
        return String.join(", ", parts);
    }

    private static String note(ProfileUpdateSubmitRequest request) {
        String note = request.note() == null ? null : request.note().strip();
        return note == null || note.isEmpty() ? null : note;
    }

    private ProfileUpdateRequest find(UUID id) {
        return profileUpdates.findById(id).orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "approval.not_found", "No such profile update"));
    }

    private static ProfileUpdateResponse response(ProfileUpdateRequest p, ApprovalRequestResponse approval) {
        List<ProfileUpdateChange> changes = p.getChanges().stream()
                .map(c -> new ProfileUpdateChange(ContactField.valueOf(c.getField()), c.getOldValue(),
                        c.getNewValue()))
                .sorted(Comparator.comparing(ProfileUpdateChange::field))
                .toList();
        return new ProfileUpdateResponse(p.getId(), approval.status(), p.getEmployeeId(), p.getNote(), changes);
    }
}
