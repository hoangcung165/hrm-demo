package com.hrmdemo.service.dashboard;

import java.time.Clock;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.dashboard.DashboardTilesResponse;
import com.hrmdemo.dto.dashboard.LeaveTodayResponse;
import com.hrmdemo.dto.leave.DayPart;
import com.hrmdemo.dto.leave.LeaveOnDay;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.employee.EmployeeSpecifications;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.leave.LeaveCalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The reads behind the Tổng quan page (HRM-20), one call per block so a block that fails does not hide the others.
 * Every number follows the caller's Phạm vi truy cập: the company, the units the caller heads and the ones below, and
 * always the caller's own Employee, exactly as the Employee list does. "Today" is the company's day.
 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final Set<EmployeeStatus> ACTIVE = EnumSet.of(EmployeeStatus.PROBATION, EmployeeStatus.OFFICIAL);

    private final EmployeeRepository employees;
    private final LeaveCalendarService leave;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    /**
     * The stat tiles. Needs {@code EMPLOYEE_VIEW}: the headcount is the Employee list's, so an Account that cannot
     * open the list (an Employee, a PM) gets 403 and shows the self-service home instead.
     */
    @Transactional(readOnly = true)
    public DashboardTilesResponse tiles(CurrentAccount caller) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_VIEW);
        LocalDate today = today();
        long active = employees.count(inScope(scope, ACTIVE));
        long inProbation = employees.count(inScope(scope, EnumSet.of(EmployeeStatus.PROBATION)));
        List<LeaveOnDay> off = leave.approvedOn(caller, today);
        long onLeave = off.stream().map(entry -> entry.employee().id()).distinct().count();
        long offAllDay = off.stream().filter(entry -> entry.part() == DayPart.FULL)
                .map(entry -> entry.employee().id()).distinct().count();
        return new DashboardTilesResponse(today, (int) active, (int) inProbation, (int) onLeave,
                (int) Math.max(0, active - offAllDay));
    }

    /**
     * Who is on approved leave today. No permission of its own, like the Lịch nghỉ phép: the data scope decides whose
     * leave shows, and an Account without a list permission sees only its own.
     */
    @Transactional(readOnly = true)
    public LeaveTodayResponse leaveToday(CurrentAccount caller) {
        LocalDate today = today();
        return new LeaveTodayResponse(today, leave.approvedOn(caller, today));
    }

    private static Specification<Employee> inScope(AccessScope scope, Set<EmployeeStatus> statuses) {
        Specification<Employee> filter = EmployeeSpecifications.matching(null, null, null, statuses, null);
        AccessScope.EmployeeFilter visible = scope.employeeFilter();
        return visible.all() ? filter
                : filter.and(EmployeeSpecifications.withinScope(visible.orgUnitIds(), visible.selfEmployeeId()));
    }

    private LocalDate today() {
        return LocalDate.ofInstant(clock.instant(), ApprovalRequestService.COMPANY_ZONE);
    }
}
