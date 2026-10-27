package com.hrmdemo.service.dashboard;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.dashboard.HeadcountResponse;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.employee.EmployeeSpecifications;
import com.hrmdemo.repository.employee.ResignationRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The people charts of the Tổng quan page (HRM-20): Employees per unit, and joins and leaves over the last 6 months.
 * Within the caller's Phạm vi truy cập, exactly as the Employee list is, and needs {@code EMPLOYEE_VIEW} like it.
 */
@Service
@RequiredArgsConstructor
public class DashboardHeadcountService {

    /** The months the flow chart shows, the current one included. */
    static final int MONTHS = 6;

    private final EmployeeRepository employees;
    private final ResignationRepository resignations;
    private final OrgUnitService orgUnits;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    @Transactional(readOnly = true)
    public HeadcountResponse headcount(CurrentAccount caller) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_VIEW);
        LocalDate today = LocalDate.ofInstant(clock.instant(), ApprovalRequestService.COMPANY_ZONE);
        List<Employee> visible = employees.findAll(inScope(scope));
        return new HeadcountResponse(today, byUnit(visible), months(visible, today));
    }

    private List<HeadcountResponse.UnitCount> byUnit(List<Employee> visible) {
        Map<UUID, String> names = new HashMap<>();
        for (OrgUnitSummary unit : orgUnits.summaries()) {
            names.put(unit.id(), unit.name());
        }
        Map<UUID, Integer> counts = new HashMap<>();
        int withoutUnit = 0;
        for (Employee employee : visible) {
            if (!employee.isActive()) {
                continue;
            }
            if (employee.getOrgUnitId() == null) {
                withoutUnit++;
            } else {
                counts.merge(employee.getOrgUnitId(), 1, Integer::sum);
            }
        }
        List<HeadcountResponse.UnitCount> rows = new ArrayList<>();
        counts.forEach((id, count) -> rows.add(new HeadcountResponse.UnitCount(id, names.get(id), count)));
        if (withoutUnit > 0) {
            rows.add(new HeadcountResponse.UnitCount(null, null, withoutUnit));
        }
        rows.sort(Comparator.comparingInt(HeadcountResponse.UnitCount::count).reversed()
                .thenComparing(row -> row.orgUnitName() == null ? "" : row.orgUnitName()));
        return rows;
    }

    private List<HeadcountResponse.MonthFlow> months(List<Employee> visible, LocalDate today) {
        YearMonth current = YearMonth.from(today);
        YearMonth first = current.minusMonths(MONTHS - 1L);
        Map<YearMonth, Integer> joins = new HashMap<>();
        for (Employee employee : visible) {
            LocalDate hired = employee.getHireDate();
            if (!hired.isAfter(today) && !hired.isBefore(first.atDay(1))) {
                joins.merge(YearMonth.from(hired), 1, Integer::sum);
            }
        }
        Map<YearMonth, Integer> leaves = new HashMap<>();
        Map<UUID, Boolean> inScope = new HashMap<>();
        visible.forEach(employee -> inScope.put(employee.getId(), true));
        resignations.findByLastWorkingDayBetween(first.atDay(1), current.atEndOfMonth()).stream()
                .filter(resignation -> inScope.containsKey(resignation.getEmployeeId()))
                .forEach(resignation -> leaves.merge(YearMonth.from(resignation.getLastWorkingDay()), 1,
                        Integer::sum));
        List<HeadcountResponse.MonthFlow> months = new ArrayList<>();
        for (YearMonth month = first; !month.isAfter(current); month = month.plusMonths(1)) {
            months.add(new HeadcountResponse.MonthFlow(month.toString(), joins.getOrDefault(month, 0),
                    leaves.getOrDefault(month, 0)));
        }
        return months;
    }

    private static Specification<Employee> inScope(AccessScope scope) {
        Specification<Employee> all = EmployeeSpecifications.matching(null, null, null, null, null);
        AccessScope.EmployeeFilter visible = scope.employeeFilter();
        return visible.all() ? all
                : all.and(EmployeeSpecifications.withinScope(visible.orgUnitIds(), visible.selfEmployeeId()));
    }
}
