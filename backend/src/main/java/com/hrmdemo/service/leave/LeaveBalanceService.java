package com.hrmdemo.service.leave;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.EmployeeWorkFacts;
import com.hrmdemo.dto.leave.LeaveBalance;
import com.hrmdemo.dto.leave.LeaveBalanceItem;
import com.hrmdemo.dto.leave.LeaveBalancesResponse;
import com.hrmdemo.dto.leave.LeaveRequestStatus;
import com.hrmdemo.entity.leave.LeaveRequest;
import com.hrmdemo.entity.leave.LeaveType;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.leave.LeaveRequestRepository;
import com.hrmdemo.repository.leave.LeaveTypeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.employee.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Số dư phép (HRM-18): computed on every read by the Chính sách phép module from the policy versions, the hire date
 * and the days the Employee's requests hold, so approving or cancelling a request changes it at once and nothing is
 * stored to drift. Everyone reads their own; reading someone else's needs {@code EMPLOYEE_VIEW} over them.
 */
@Service
@RequiredArgsConstructor
public class LeaveBalanceService {

    static final Set<LeaveRequestStatus> HOLDING = EnumSet.of(LeaveRequestStatus.PENDING, LeaveRequestStatus.RETURNED,
            LeaveRequestStatus.APPROVED);

    private final LeaveRequestRepository requests;
    private final LeaveTypeRepository types;
    private final LeavePolicyService policies;
    private final EmployeeService employees;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    /**
     * The balance of every active type (and of an inactive one the Employee has days of that year).
     *
     * @param employeeId null for the caller's own
     * @param year       null for this year
     */
    @Transactional(readOnly = true)
    public LeaveBalancesResponse balances(CurrentAccount caller, UUID employeeId, Integer year) {
        UUID target = employeeId == null ? ApprovalRequestService.requireEmployee(caller) : employeeId;
        EmployeeWorkFacts facts = employees.workFacts(Set.of(target)).get(target);
        if (!target.equals(caller.employeeId())) {
            AccessScope scope = accessScopes.scopeOf(caller);
            scope.require(Permission.EMPLOYEE_VIEW);
            if (facts == null) {
                throw new ApiException(HttpStatus.NOT_FOUND, "employee.not_found", "No such employee");
            }
            scope.requireEmployee(target, facts.orgUnitId());
        }
        LocalDate today = today();
        int y = year == null ? today.getYear() : year;
        if (y < 2000 || y > 9999) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request value is invalid: year")
                    .with("errors", List.of(Map.of("field", "year", "code", "invalid")));
        }
        List<BookedDay> booked = bookedDays(target);
        List<LeaveType> all = types.findAllByOrderBySortOrderAscNameAsc();
        Map<UUID, List<LeaveRule>> histories = policies.histories(all.stream().map(LeaveType::getId).toList());
        LocalDate ruleDay = today.getYear() == y ? today : LocalDate.of(y, today.getYear() < y ? 1 : 12,
                today.getYear() < y ? 1 : 31);
        List<LeaveBalanceItem> items = new ArrayList<>();
        for (LeaveType type : all) {
            List<LeaveRule> history = histories.getOrDefault(type.getId(), List.of());
            LeaveRule rule = LeavePolicyEngine.ruleOn(history, ruleDay);
            boolean hasDays = booked.stream()
                    .anyMatch(day -> day.leaveTypeId().equals(type.getId()) && day.date().getYear() == y);
            if (rule == null || (!type.isActive() && !hasDays)) {
                continue;
            }
            LeaveBalance balance = LeavePolicyEngine.balance(type.getId(), history, facts.hireDate(), y, today,
                    booked);
            items.add(new LeaveBalanceItem(LeavePolicyService.ref(type), rule.pay(), rule.halfDayAllowed(),
                    rule.attachmentRequired(), balance));
        }
        return new LeaveBalancesResponse(facts.card(), y, today, items);
    }

    /** The balance of one type for one Employee and year, as of today. */
    @Transactional(readOnly = true)
    public LeaveBalance balance(UUID employeeId, LocalDate hireDate, UUID leaveTypeId, int year) {
        return LeavePolicyEngine.balance(leaveTypeId, policies.history(leaveTypeId), hireDate, year, today(),
                bookedDays(employeeId));
    }

    /** The days the Employee's requests hold: waiting and returned ones as Đang chờ, approved ones as Đã dùng. */
    @Transactional(readOnly = true)
    public List<BookedDay> bookedDays(UUID employeeId) {
        List<BookedDay> booked = new ArrayList<>();
        for (LeaveRequest request : requests.findByEmployeeIdAndStatusIn(employeeId, HOLDING)) {
            boolean approved = request.getStatus() == LeaveRequestStatus.APPROVED;
            for (LeaveRequest.Day day : request.getDayList()) {
                if (day.getValue().signum() > 0) {
                    booked.add(new BookedDay(request.getId(), request.getLeaveTypeId(), day.getDay(), day.isMorning(),
                            day.isAfternoon(), day.getValue(), approved));
                }
            }
        }
        return booked;
    }

    private LocalDate today() {
        return LocalDate.ofInstant(clock.instant(), ApprovalRequestService.COMPANY_ZONE);
    }
}
