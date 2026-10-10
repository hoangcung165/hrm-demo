package com.hrmdemo.service.exampledata;

import static com.hrmdemo.dto.employee.ContactField.ADDRESS;
import static com.hrmdemo.dto.employee.ContactField.EMERGENCY_CONTACT_NAME;
import static com.hrmdemo.dto.employee.ContactField.EMERGENCY_CONTACT_PHONE;
import static com.hrmdemo.dto.employee.ContactField.EMERGENCY_CONTACT_RELATIONSHIP;
import static com.hrmdemo.dto.employee.ContactField.PERSONAL_EMAIL;
import static com.hrmdemo.dto.employee.ContactField.PHONE;

import java.time.Clock;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.UnaryOperator;

import com.hrmdemo.dto.approval.ApprovalDelegationRequest;
import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.employee.EmergencyContact;
import com.hrmdemo.dto.employee.EmployeeContact;
import com.hrmdemo.dto.profileupdate.ProfileUpdateSubmitRequest;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.approval.ApprovalDelegationService;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.auth.AccountAdminService;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.profileupdate.ProfileUpdateRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * The example Hộp thư duyệt, so the demo personas open a filled inbox: a few Cập nhật hồ sơ requests at different
 * steps of the default flow (Quản lý trực tiếp, then HR) and one Ủy quyền duyệt. Trương Thị Ngọc Hân gets an HR
 * Account, so the HR level has two approvers and Trần Thị Mai's own requests have someone to go to.
 * <p>
 * Afterwards Lê Văn Hùng (Line manager persona) has Nguyễn Văn An's and Mạc Thị Quỳnh's requests waiting and has
 * delegated them for two weeks to Vũ Thị Lan (PM persona); Trần Thị Mai (HR persona) has Cao Minh Trí's and Kiều Văn
 * Thành's at level 2 and Hân's at level 1. Everything goes through the services, as the people would do it, so the
 * steps, the log and the bell are real. The seeder calls it only once the demo personas are linked.
 */
@Component
@ConditionalOnProperty(name = "hrm.example-data.enabled", havingValue = "true")
@RequiredArgsConstructor
class ExampleApprovals {

    static final String HR_COLLEAGUE = "Trương Thị Ngọc Hân";
    static final String HR_COLLEAGUE_EMAIL = "han.truong@example.com";

    private final AccountAdminService accountAdminService;
    private final EmployeeService employeeService;
    private final ProfileUpdateRequestService profileUpdates;
    private final ApprovalRequestService approvals;
    private final ApprovalDelegationService delegations;
    private final Clock clock;

    /**
     * @param ids the example Employees by full name; a missing one leaves out what it sends or approves
     * @return how many requests were sent
     */
    int seed(Map<String, UUID> ids) {
        UUID han = ids.get(HR_COLLEAGUE);
        if (han != null) {
            accountAdminService.createExampleAccountAsSystem(HR_COLLEAGUE_EMAIL, HR_COLLEAGUE,
                    EnumSet.of(Role.HR, Role.EMPLOYEE), han);
        }
        UUID hung = ids.get("Lê Văn Hùng");
        int sent = 0;
        sent += count(send(ids.get("Nguyễn Văn An"), "Em vừa chuyển nhà và đổi số điện thoại.",
                contact -> contact.with(PHONE, "0912345678")
                        .with(ADDRESS, "18 Ngõ 52 Tô Ngọc Vân, Tây Hồ, Hà Nội")));
        sent += count(send(ids.get("Mạc Thị Quỳnh"), "Em đổi email cá nhân và chuyển chỗ trọ.",
                contact -> contact.with(PERSONAL_EMAIL, "quynh.mac.work@example.com")
                        .with(ADDRESS, "25 Lạch Tray, Ngô Quyền, Hải Phòng")));
        UUID tri = send(ids.get("Cao Minh Trí"), "Bổ sung người liên hệ khẩn cấp theo yêu cầu của phòng.",
                contact -> contact.with(EMERGENCY_CONTACT_NAME, "Cao Thị Hoa")
                        .with(EMERGENCY_CONTACT_RELATIONSHIP, "Mẹ")
                        .with(EMERGENCY_CONTACT_PHONE, "0903456789"));
        approve(tri, hung, "Đã kiểm tra với Trí, thông tin đúng.");
        UUID thanh = send(ids.get("Kiều Văn Thành"), null, contact -> contact.with(PHONE, "0978123456"));
        approve(thanh, ids.get("Đỗ Thị Thu Hằng"), null);
        sent += count(tri) + count(thanh);
        sent += count(send(han, "Số cũ em không dùng nữa.", contact -> contact.with(PHONE, "0938765432")));
        delegate(hung, ids.get("Vũ Thị Lan"));
        return sent;
    }

    /** Sends a profile update as the Employee: their contact fields with the change applied. */
    private UUID send(UUID sender, String note, UnaryOperator<EmployeeContact> change) {
        if (sender == null) {
            return null;
        }
        EmployeeContact wanted = change.apply(employeeService.contactOf(sender));
        EmergencyContact emergency = new EmergencyContact(wanted.emergencyContactName(),
                wanted.emergencyContactRelationship(), wanted.emergencyContactPhone());
        return profileUpdates.submit(as(sender), new ProfileUpdateSubmitRequest(wanted.personalEmail(),
                wanted.phone(), wanted.address(), emergency, note)).id();
    }

    private void approve(UUID request, UUID approver, String note) {
        if (request != null && approver != null) {
            approvals.approve(as(approver), request, note);
        }
    }

    private void delegate(UUID delegator, UUID delegate) {
        if (delegator == null || delegate == null) {
            return;
        }
        LocalDate today = LocalDate.ofInstant(clock.instant(), ApprovalRequestService.COMPANY_ZONE);
        delegations.create(as(delegator), new ApprovalDelegationRequest(delegate, today, today.plusDays(13),
                Set.of(ApprovalRequestType.PROFILE_UPDATE, ApprovalRequestType.LEAVE)));
    }

    private static int count(UUID request) {
        return request == null ? 0 : 1;
    }

    /** The Employee acting, with no Account: the seeder signs nobody in. */
    private static CurrentAccount as(UUID employee) {
        return new CurrentAccount(null, employee, Set.of(Role.EMPLOYEE.name()));
    }
}
