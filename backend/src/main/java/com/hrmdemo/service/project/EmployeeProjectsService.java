package com.hrmdemo.service.project;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.project.EmployeeProjectsResponse;
import com.hrmdemo.dto.project.EmployeeProjectsResponse.Cell;
import com.hrmdemo.dto.project.EmployeeProjectsResponse.Item;
import com.hrmdemo.dto.project.EmployeeProjectsResponse.Strip;
import com.hrmdemo.dto.project.LoadPeriodView;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.project.Project;
import com.hrmdemo.entity.project.ProjectAllocation;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.project.ProjectAllocationRepository;
import com.hrmdemo.repository.project.ProjectRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.allocation.AllocationCalculator;
import com.hrmdemo.service.allocation.AllocationCalculator.Granularity;
import com.hrmdemo.service.allocation.EmployeeLoad;
import com.hrmdemo.service.allocation.PlannedAllocation;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.resource.HeatmapWindow;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The "Dự án" tab of an Employee's profile. Everyone may read their own; another Employee's needs EMPLOYEE_VIEW within
 * the data scope (as the profile does) and PROJECT_VIEW (as the project's own screens do).
 */
@Service
@RequiredArgsConstructor
public class EmployeeProjectsService {

    private final AllocationCalculator calculator = new AllocationCalculator();

    private final EmployeeRepository employees;
    private final EmployeeService employeeCards;
    private final ProjectAllocationRepository allocations;
    private final ProjectRepository projects;
    private final CatalogService catalogs;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    @Transactional(readOnly = true)
    public EmployeeProjectsResponse get(CurrentAccount caller, UUID employeeId) {
        AccessScope scope = accessScopes.scopeOf(caller);
        boolean own = employeeId.equals(caller.employeeId());
        if (!own) {
            scope.require(Permission.EMPLOYEE_VIEW);
            scope.require(Permission.PROJECT_VIEW);
        }
        Employee employee = employees.findById(employeeId).orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "employee.not_found", "Employee not found"));
        if (!own) {
            scope.requireEmployee(employee.getId(), employee.getOrgUnitId());
        }

        LocalDate today = LocalDate.ofInstant(clock.instant(), ApprovalRequestService.COMPANY_ZONE);
        List<ProjectAllocation> all = allocations.findByEmployeeIdIn(Set.of(employeeId)).stream()
                .sorted(Comparator.comparing(ProjectAllocation::getStartDate).reversed()
                        .thenComparing(Comparator.comparing(ProjectAllocation::getEndDate).reversed())
                        .thenComparing(ProjectAllocation::getId))
                .toList();

        Map<UUID, Project> named = projects.findAllById(
                all.stream().map(ProjectAllocation::getProjectId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(Project::getId, Function.identity()));
        Set<UUID> roleIds = all.stream().map(ProjectAllocation::getProjectRoleId).collect(Collectors.toSet());
        Map<UUID, CatalogItemRef> roles = catalogs.findItems(Catalog.PROJECT_ROLE, roleIds);
        Set<UUID> pmIds = new HashSet<>();
        named.values().forEach(p -> pmIds.add(p.getPmEmployeeId()));
        Map<UUID, EmployeeCard> pms = employeeCards.cards(pmIds);

        List<Item> items = all.stream().map(a -> {
            Project p = named.get(a.getProjectId());
            String status = a.getEndDate().isBefore(today) ? "ENDED" : a.getStartDate().isAfter(today) ? "UPCOMING"
                    : "RUNNING";
            return new Item(a.getId(), a.getProjectId(), p == null ? null : p.getCode(), p == null ? null : p.getName(),
                    p == null ? null : p.getClient(), p == null ? null : p.getStatus().name(),
                    p == null ? null : pms.get(p.getPmEmployeeId()), roles.get(a.getProjectRoleId()), a.getPercent(),
                    a.getStartDate(), a.getEndDate(), status);
        }).toList();
        return new EmployeeProjectsResponse(items, strip(employeeId, all, named, today));
    }

    private Strip strip(UUID employeeId, List<ProjectAllocation> all, Map<UUID, Project> named, LocalDate today) {
        HeatmapWindow window = HeatmapWindow.of(Granularity.WEEK, today, HeatmapWindow.DEFAULT_WEEKS);
        EmployeeLoad load = calculator.load(employeeId, all.stream().map(a -> new PlannedAllocation(a.getId(),
                a.getEmployeeId(), a.getProjectId(), a.getPercent(), a.getStartDate(), a.getEndDate())).toList(),
                window.from(), window.to());
        List<Cell> cells = calculator.buckets(load, Granularity.WEEK, window.from(), window.to()).stream()
                .map(b -> new Cell(b.from(), b.to(), b.peakPercent())).toList();
        List<LoadPeriodView> overloaded = LoadViews.of(load.overloadedPeriods(), named, null);
        return new Strip(window.from(), window.to(), cells, load.overloaded(),
                overloaded.isEmpty() ? null : overloaded.get(0));
    }
}
