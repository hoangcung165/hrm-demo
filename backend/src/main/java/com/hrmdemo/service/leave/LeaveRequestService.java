package com.hrmdemo.service.leave;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.approval.ApprovalRequestResponse;
import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.employee.EmployeeWorkFacts;
import com.hrmdemo.dto.leave.LeaveAbsence;
import com.hrmdemo.dto.leave.LeaveApproversPreview;
import com.hrmdemo.dto.leave.LeaveBalance;
import com.hrmdemo.dto.leave.LeaveCheckResponse;
import com.hrmdemo.dto.leave.LeaveDay;
import com.hrmdemo.dto.leave.LeaveRequestListItem;
import com.hrmdemo.dto.leave.LeaveRequestPayload;
import com.hrmdemo.dto.leave.LeaveRequestResponse;
import com.hrmdemo.dto.leave.LeaveRequestStatus;
import com.hrmdemo.dto.leave.LeaveTypeRef;
import com.hrmdemo.entity.leave.LeaveAttachment;
import com.hrmdemo.entity.leave.LeaveRequest;
import com.hrmdemo.entity.leave.LeaveType;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.leave.LeaveAttachmentRepository;
import com.hrmdemo.repository.leave.LeaveRequestRepository;
import com.hrmdemo.repository.leave.LeaveTypeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.approval.ApprovalEvent;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.leave.LeavePolicyEngine.LeaveCheck;
import com.hrmdemo.service.leave.LeavePolicyEngine.LeaveContext;
import com.hrmdemo.service.leave.LeavePolicyEngine.LeaveDraft;
import com.hrmdemo.service.workschedule.WorkScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Đơn nghỉ (HRM-18), a type of Yêu cầu phê duyệt (LEAVE) that goes through the Luồng phê duyệt "Nghỉ phép". The
 * sender checks a request without saving it, sends it (with people to copy and files), edits and sends it again when
 * it is returned, and cancels it while it waits, or after approval until it starts, which gives the days back. Its
 * status follows the approval request; the Số dư phép is computed from the statuses, so it follows too.
 * <p>
 * Who may open a request: its sender, everyone the approval request lets in (approvers, delegates, past actors), and
 * the people it copies (without the approval steps, the balance and the absences of the unit).
 */
@Service
@RequiredArgsConstructor
public class LeaveRequestService {

    static final int MAX_CC = 10;
    static final int MAX_ATTACHMENTS = 5;
    static final int MAX_REASON = 500;
    static final int MAX_PAGE_SIZE = 100;

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DAY_MONTH = DateTimeFormatter.ofPattern("dd/MM");

    private final LeaveRequestRepository requests;
    private final LeaveTypeRepository types;
    private final LeaveAttachmentRepository attachments;
    private final LeavePolicyService policies;
    private final LeaveBalanceService balances;
    private final WorkScheduleService workSchedule;
    private final CatalogService catalogs;
    private final EmployeeService employees;
    private final ApprovalRequestService approvals;
    private final Clock clock;

    /** Checks a request without saving it: the days it counts, the balance before and after, what stops it. */
    @Transactional(readOnly = true)
    public LeaveCheckResponse check(CurrentAccount caller, LeaveRequestPayload payload) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        EmployeeWorkFacts facts = facts(me);
        Draft draft = draft(payload, me, null);
        LeaveCheck check = runCheck(draft, facts, me, null);
        return new LeaveCheckResponse(check.days(), check.total(), check.balance(), check.remainingAfter(),
                check.problems(), preview(me));
    }

    /** Sends the caller's request for approval; refused with the first problem's code when the check finds any. */
    @Transactional
    public LeaveRequestResponse submit(CurrentAccount caller, LeaveRequestPayload payload) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        // Two requests sent at once wait for each other, so both are checked against the same balance.
        EmployeeWorkFacts facts = employees.lockWorkFacts(me).orElseThrow(LeaveRequestService::noEmployee);
        Draft draft = draft(payload, me, null);
        LeaveCheck check = runCheck(draft, facts, me, null);
        refuseIfProblems(check);
        UUID id = approvals.submit(me, ApprovalRequestType.LEAVE, null, summary(draft, check.total()));
        LeaveRequest request = requests.save(new LeaveRequest(id, me, content(draft, check), now()));
        draft.attachments().forEach(attachment -> attachment.attachTo(id));
        return detail(caller, me, request);
    }

    /** "Đơn của tôi": the caller's requests touching the year, latest first. */
    @Transactional(readOnly = true)
    public PageResponse<LeaveRequestListItem> mine(CurrentAccount caller, Integer year, int page, int size) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        int y = year == null ? today().getYear() : year;
        if (y < 2000 || y > 9999 || page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            String field = y < 2000 || y > 9999 ? "year" : page < 0 ? "page" : "size";
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request value is invalid: " + field)
                    .with("errors", List.of(Map.of("field", field, "code", "invalid")));
        }
        Map<UUID, LeaveTypeRef> typeRefs = typeRefs();
        LocalDate today = today();
        return PageResponse.of(requests.findOfEmployeeTouching(me, LocalDate.of(y, 1, 1), LocalDate.of(y, 12, 31),
                PageRequest.of(page, size)), request -> new LeaveRequestListItem(request.getId(), request.getStatus(),
                typeRefs.get(request.getLeaveTypeId()), request.getStartDate(), request.getStartPart(),
                request.getEndDate(), request.getEndPart(), request.getDays(), canCancel(request, me, today),
                request.getCreatedAt()));
    }

    @Transactional(readOnly = true)
    public LeaveRequestResponse get(CurrentAccount caller, UUID id) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        return detail(caller, me, find(id));
    }

    /** Sửa và gửi lại: the sender's new content for a request returned to them, sent again at the same level. */
    @Transactional
    public LeaveRequestResponse resubmit(CurrentAccount caller, UUID id, LeaveRequestPayload payload) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        LeaveRequest request = find(id);
        requireSender(caller, me, request);
        if (request.getStatus() != LeaveRequestStatus.RETURNED) {
            throw new ApiException(HttpStatus.CONFLICT, "leave.not_returned",
                    "Only a request returned to its sender can be changed");
        }
        EmployeeWorkFacts facts = employees.lockWorkFacts(me).orElseThrow(LeaveRequestService::noEmployee);
        Draft draft = draft(payload, me, id);
        LeaveCheck check = runCheck(draft, facts, me, id);
        refuseIfProblems(check);
        Set<UUID> kept = new LinkedHashSet<>();
        draft.attachments().forEach(attachment -> {
            attachment.attachTo(id);
            kept.add(attachment.getId());
        });
        attachments.findByLeaveRequestId(id).stream().filter(old -> !kept.contains(old.getId()))
                .forEach(LeaveAttachment::detach);
        request.replace(content(draft, check), now());
        approvals.resubmit(caller, id, null, summary(draft, check.total()));
        return detail(caller, me, request);
    }

    /**
     * Hủy đơn by its sender: while it waits or is returned (the approval request is cancelled), or once approved until
     * the day it starts (the days go back to the balance). After the leave has started HR handles changes.
     */
    @Transactional
    public LeaveRequestResponse cancel(CurrentAccount caller, UUID id) {
        UUID me = ApprovalRequestService.requireEmployee(caller);
        LeaveRequest request = find(id);
        requireSender(caller, me, request);
        switch (request.getStatus()) {
            case PENDING, RETURNED -> approvals.cancel(caller, id);
            case APPROVED -> {
                if (!request.getStartDate().isAfter(today())) {
                    throw new ApiException(HttpStatus.CONFLICT, "leave.already_started",
                            "The leave has started; ask HR to change it");
                }
                request.cancelApproved(now());
            }
            default -> throw new ApiException(HttpStatus.CONFLICT, "leave.already_closed",
                    "The request is already rejected or cancelled");
        }
        return detail(caller, me, request);
    }

    /** A file to download. */
    public record Download(String fileName, String contentType, byte[] content) {
    }

    /** A file of a request, for whoever may open the request. */
    @Transactional(readOnly = true)
    public Download attachment(CurrentAccount caller, UUID requestId, UUID attachmentId) {
        get(caller, requestId);
        LeaveAttachment file = attachments.findById(attachmentId).filter(a -> requestId.equals(a.getLeaveRequestId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "attachment.not_found",
                        "Attachment not found"));
        return new Download(file.getFileName(), file.getContentType(), file.getContent());
    }

    /** The request follows its Yêu cầu phê duyệt, in the same transaction. */
    @EventListener
    void onApprovalEvent(ApprovalEvent event) {
        if (event.requestType() != ApprovalRequestType.LEAVE) {
            return;
        }
        LeaveRequestStatus next = switch (event.type()) {
            case APPROVED -> LeaveRequestStatus.APPROVED;
            case REJECTED -> LeaveRequestStatus.REJECTED;
            case RETURNED -> LeaveRequestStatus.RETURNED;
            case RESUBMITTED -> LeaveRequestStatus.PENDING;
            case CANCELLED -> LeaveRequestStatus.CANCELLED;
            default -> null;
        };
        if (next != null) {
            // A request sent without content (only possible from code, e.g. engine tests) has nothing to follow.
            requests.findById(event.requestId()).ifPresent(request -> request.follow(next, event.at()));
        }
    }

    // ---------------------------------------------------------------------------------------------------- the draft

    /** A request as written, its fields checked: the type, the days asked for, the people copied and the files. */
    private record Draft(LeaveType type, LeaveSpan span, String reason, Set<UUID> cc,
            List<LeaveAttachment> attachments) {
    }

    /** Checks every field and reports all failing ones at once ({@code validation.invalid}). */
    private Draft draft(LeaveRequestPayload payload, UUID me, UUID replacing) {
        List<Map<String, String>> errors = new ArrayList<>();
        if (payload == null) {
            throw invalid(List.of(error("leaveTypeId", "required")));
        }
        LeaveType type = null;
        if (payload.leaveTypeId() == null) {
            errors.add(error("leaveTypeId", "required"));
        } else {
            type = types.findById(payload.leaveTypeId()).orElse(null);
            if (type == null) {
                errors.add(error("leaveTypeId", "not_found"));
            } else if (!type.isActive()) {
                errors.add(error("leaveTypeId", "inactive"));
            }
        }
        requireField(payload.startDate(), "startDate", errors);
        requireField(payload.startPart(), "startPart", errors);
        requireField(payload.endDate(), "endDate", errors);
        requireField(payload.endPart(), "endPart", errors);
        String reason = payload.reason() == null || payload.reason().isBlank() ? null : payload.reason().strip();
        if (reason != null && reason.length() > MAX_REASON) {
            errors.add(error("reason", "too_long"));
        }
        Set<UUID> cc = new LinkedHashSet<>(payload.cc() == null ? List.of() : payload.cc());
        cc.remove(null);
        if (cc.size() > MAX_CC) {
            errors.add(error("cc", "too_many"));
        } else if (cc.contains(me)) {
            errors.add(error("cc", "self"));
        } else if (!employees.activeIds(cc).containsAll(cc)) {
            errors.add(error("cc", "not_found"));
        }
        Set<UUID> attachmentIds = new LinkedHashSet<>(payload.attachmentIds() == null ? List.of()
                : payload.attachmentIds());
        attachmentIds.remove(null);
        List<LeaveAttachment> files = List.of();
        if (attachmentIds.size() > MAX_ATTACHMENTS) {
            errors.add(error("attachmentIds", "too_many"));
        } else if (!attachmentIds.isEmpty()) {
            files = attachments.findByEmployeeIdAndIdIn(me, attachmentIds);
            boolean usable = files.size() == attachmentIds.size() && files.stream().allMatch(file ->
                    file.getLeaveRequestId() == null || file.getLeaveRequestId().equals(replacing));
            if (!usable) {
                errors.add(error("attachmentIds", "not_found"));
            }
        }
        if (!errors.isEmpty()) {
            throw invalid(errors);
        }
        return new Draft(type, new LeaveSpan(payload.startDate(), payload.startPart(), payload.endDate(),
                payload.endPart()), reason, cc, files);
    }

    private LeaveCheck runCheck(Draft draft, EmployeeWorkFacts facts, UUID me, UUID replacing) {
        LeaveSpan span = draft.span();
        boolean countable = !span.end().isBefore(span.start())
                && ChronoUnit.DAYS.between(span.start(), span.end()) < LeavePolicyEngine.MAX_SPAN_DAYS;
        Map<LocalDate, String> holidays = countable ? catalogs.holidayDays(span.start(), span.end())
                : Map.of();
        LeaveContext context = new LeaveContext(today(), facts.hireDate(), policies.history(draft.type().getId()),
                workSchedule.current(), holidays, balances.bookedDays(me));
        return LeavePolicyEngine.check(new LeaveDraft(draft.type().getId(), span, draft.attachments().size(),
                replacing), context);
    }

    private static void refuseIfProblems(LeaveCheck check) {
        if (!check.ok()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, check.problems().get(0).code(),
                    "The leave request cannot be sent as it is").with("problems", check.problems());
        }
    }

    private static LeaveRequest.Content content(Draft draft, LeaveCheck check) {
        List<LeaveRequest.Day> days = check.days().stream()
                .map(day -> new LeaveRequest.Day(day.date(), day.kind(), day.morning(), day.afternoon(), day.value()))
                .toList();
        LeaveSpan span = draft.span();
        return new LeaveRequest.Content(draft.type().getId(), span.start(), span.startPart(), span.end(),
                span.endPart(), check.total(), draft.reason(), days, draft.cc());
    }

    /**
     * One line for the inbox, the bell and the emails, in Vietnamese like the other request types:
     * "Phép năm, 3 ngày (20/11 – 25/11/2026)", "Phép năm, 0,5 ngày (21/10/2026, buổi sáng)".
     */
    static String summary(Draft draft, BigDecimal total) {
        LeaveSpan span = draft.span();
        String days = total.stripTrailingZeros().toPlainString().replace('.', ',');
        String range;
        if (span.start().equals(span.end())) {
            range = DAY.format(span.start()) + switch (span.startPart()) {
                case MORNING -> ", buổi sáng";
                case AFTERNOON -> ", buổi chiều";
                case FULL -> "";
            };
        } else if (span.start().getYear() == span.end().getYear()) {
            range = DAY_MONTH.format(span.start()) + " – " + DAY.format(span.end());
        } else {
            range = DAY.format(span.start()) + " – " + DAY.format(span.end());
        }
        return draft.type().getName() + ", " + days + " ngày (" + range + ")";
    }

    // --------------------------------------------------------------------------------------------------- the detail

    private LeaveRequestResponse detail(CurrentAccount caller, UUID me, LeaveRequest request) {
        boolean sender = me.equals(request.getEmployeeId());
        boolean copied = request.getCc().contains(me);
        ApprovalRequestResponse approval = approvals.findForCaller(caller, request.getId()).orElse(null);
        if (approval == null && !copied) {
            throw new ApiException(HttpStatus.NOT_FOUND, "approval.not_found", "No such leave request");
        }
        Set<UUID> people = new LinkedHashSet<>(request.getCc());
        people.add(request.getEmployeeId());
        Map<UUID, EmployeeWorkFacts> facts = employees.workFacts(people);
        EmployeeWorkFacts senderFacts = facts.get(request.getEmployeeId());
        Map<UUID, LeaveTypeRef> typeRefs = typeRefs();
        LocalDate today = today();

        LeaveBalance balance = null;
        BigDecimal before = null;
        BigDecimal after = null;
        List<LeaveAbsence> absences = List.of();
        if (approval != null) {
            int year = request.getStartDate().getYear();
            balance = balances.balance(request.getEmployeeId(), senderFacts.hireDate(), request.getLeaveTypeId(),
                    year);
            if (balance.limited() && request.getStatus().holdsDays()) {
                BigDecimal own = request.getDayList().stream().filter(day -> day.getDay().getYear() == year)
                        .map(LeaveRequest.Day::getValue).reduce(BigDecimal.ZERO, BigDecimal::add);
                after = balance.remaining();
                before = LeavePolicyEngine.scaled(after.add(own));
            }
            absences = absences(request, senderFacts, typeRefs);
        }
        Map<LocalDate, String> holidays = catalogs.holidayDays(request.getStartDate(), request.getEndDate());
        List<LeaveDay> days = request.getDayList().stream()
                .map(day -> new LeaveDay(day.getDay(), day.getKind(), day.isMorning(), day.isAfternoon(),
                        LeavePolicyEngine.scaled(day.getValue()), holidays.get(day.getDay())))
                .toList();
        List<EmployeeCard> cc = request.getCc().stream().map(facts::get).filter(Objects::nonNull)
                .map(EmployeeWorkFacts::card).toList();
        return new LeaveRequestResponse(request.getId(), request.getStatus(), senderFacts.card(),
                typeRefs.get(request.getLeaveTypeId()), request.getStartDate(), request.getStartPart(),
                request.getEndDate(), request.getEndPart(), LeavePolicyEngine.scaled(request.getDays()), days,
                request.getReason(), cc, attachments.summaries(request.getId()), approval, balance, before, after,
                absences, sender && request.getStatus() == LeaveRequestStatus.RETURNED,
                canCancel(request, me, today), request.getCreatedAt(), request.getUpdatedAt(),
                request.getCancelledAt());
    }

    /** Others of the sender's unit with a request holding days in the same range. */
    private List<LeaveAbsence> absences(LeaveRequest request, EmployeeWorkFacts sender,
            Map<UUID, LeaveTypeRef> typeRefs) {
        if (sender.orgUnitId() == null) {
            return List.of();
        }
        List<LeaveRequest> touching = requests.findTouching(LeaveBalanceService.HOLDING, request.getStartDate(),
                request.getEndDate()).stream()
                .filter(other -> !other.getEmployeeId().equals(request.getEmployeeId()))
                .toList();
        Map<UUID, EmployeeWorkFacts> others = employees.workFacts(
                touching.stream().map(LeaveRequest::getEmployeeId).collect(Collectors.toSet()));
        List<LeaveAbsence> absences = new ArrayList<>();
        for (LeaveRequest other : touching) {
            EmployeeWorkFacts facts = others.get(other.getEmployeeId());
            if (facts != null && sender.orgUnitId().equals(facts.orgUnitId())) {
                absences.add(new LeaveAbsence(facts.card(), typeRefs.get(other.getLeaveTypeId()),
                        other.getStartDate(), other.getStartPart(), other.getEndDate(), other.getEndPart(),
                        other.getStatus()));
            }
        }
        return absences;
    }

    private LeaveApproversPreview preview(UUID me) {
        ApprovalRequestService.Preview preview = approvals.preview(me, ApprovalRequestType.LEAVE);
        Map<UUID, EmployeeCard> cards = employees.cards(preview.firstLevel());
        List<EmployeeCard> first = preview.firstLevel().stream().map(cards::get).filter(Objects::nonNull)
                .sorted(Comparator.comparing(EmployeeCard::fullName)).toList();
        return new LeaveApproversPreview(preview.levelCount(), first, preview.autoApproveDays());
    }

    private static boolean canCancel(LeaveRequest request, UUID me, LocalDate today) {
        if (!me.equals(request.getEmployeeId())) {
            return false;
        }
        return switch (request.getStatus()) {
            case PENDING, RETURNED -> true;
            case APPROVED -> request.getStartDate().isAfter(today);
            default -> false;
        };
    }

    private void requireSender(CurrentAccount caller, UUID me, LeaveRequest request) {
        if (!me.equals(request.getEmployeeId())) {
            boolean sees = request.getCc().contains(me) || approvals.findForCaller(caller, request.getId()).isPresent();
            if (!sees) {
                throw new ApiException(HttpStatus.NOT_FOUND, "approval.not_found", "No such leave request");
            }
            throw new ApiException(HttpStatus.FORBIDDEN, "approval.not_sender", "Only the sender may do this");
        }
    }

    private Map<UUID, LeaveTypeRef> typeRefs() {
        Map<UUID, LeaveTypeRef> refs = new HashMap<>();
        policies.refs().forEach(ref -> refs.put(ref.id(), ref));
        return refs;
    }

    private EmployeeWorkFacts facts(UUID me) {
        EmployeeWorkFacts facts = employees.workFacts(Set.of(me)).get(me);
        if (facts == null) {
            throw noEmployee();
        }
        return facts;
    }

    private LeaveRequest find(UUID id) {
        return requests.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "approval.not_found",
                "No such leave request"));
    }

    private static ApiException noEmployee() {
        return new ApiException(HttpStatus.FORBIDDEN, "approval.no_employee",
                "Only an Account linked to an Employee sends leave requests");
    }

    private static void requireField(Object value, String field, List<Map<String, String>> errors) {
        if (value == null) {
            errors.add(error(field, "required"));
        }
    }

    private static Map<String, String> error(String field, String code) {
        return Map.of("field", field, "code", code);
    }

    private static ApiException invalid(List<Map<String, String>> errors) {
        return new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request values are invalid")
                .with("errors", errors);
    }

    private LocalDate today() {
        return LocalDate.ofInstant(clock.instant(), ApprovalRequestService.COMPANY_ZONE);
    }

    private Instant now() {
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }
}
