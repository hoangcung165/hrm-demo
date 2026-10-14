package com.hrmdemo.service.resource;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Arrays;
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
import com.hrmdemo.dto.resource.CellDetailResponse;
import com.hrmdemo.dto.resource.CellDetailResponse.AllocationRef;
import com.hrmdemo.dto.resource.HeatmapResponse;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.project.Project;
import com.hrmdemo.entity.project.ProjectAllocation;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.project.ProjectAllocationRepository;
import com.hrmdemo.repository.project.ProjectRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.allocation.AllocationCalculator;
import com.hrmdemo.service.allocation.AllocationCalculator.Granularity;
import com.hrmdemo.service.allocation.EmployeeLoad;
import com.hrmdemo.service.allocation.PlannedAllocation;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeListService;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.project.FieldErrors;
import com.hrmdemo.service.project.LoadViews;
import com.hrmdemo.service.resource.HeatmapTable.Row;
import com.hrmdemo.service.resource.ResourceThresholds.Level;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The resource heatmap and its cell detail (HRM-17). Needs {@link Permission#RESOURCE_VIEW}; the view is company-wide
 * (like the project list), not limited by the data scope.
 * <p>
 * A heatmap reads the people (one query), their allocations of the window and of the current week (one query), and
 * completes the page it returns; filtering by load level and sorting by load happen in memory ({@link HeatmapTable}),
 * which is cheap for a company of a few hundred people.
 */
@Service
@RequiredArgsConstructor
public class ResourceHeatmapService {

    static final int MAX_PAGE_SIZE = 200;
    static final int MAX_DETAIL_DAYS = 100;
    static final int MAX_SEARCH_LENGTH = 100;

    private final AllocationCalculator calculator = new AllocationCalculator();

    private final EmployeeListService employeeList;
    private final EmployeeService employeeCards;
    private final EmployeeRepository employees;
    private final ProjectAllocationRepository allocations;
    private final ProjectRepository projects;
    private final CatalogService catalogs;
    private final ResourceSettingsService settings;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    /**
     * @param from        any day of the first column; null: today
     * @param granularity WEEK (default) or MONTH
     * @param columns     number of columns, 1 to 12; null: 12 weeks or 6 months
     * @param orgUnitId   only people of this unit (and the units below it with {@code includeSubUnits})
     * @param level       BENCH, PARTIAL, FULL or OVER: only people whose peak in the window is on this level
     * @param sort        LOAD_DESC (default), LOAD_ASC or NAME
     */
    public record Query(LocalDate from, String granularity, Integer columns, String q, UUID orgUnitId,
            boolean includeSubUnits, String level, String sort, int page, int size) {
    }

    @Transactional(readOnly = true)
    public HeatmapResponse heatmap(CurrentAccount caller, Query query) {
        accessScopes.scopeOf(caller).require(Permission.RESOURCE_VIEW);
        FieldErrors errors = new FieldErrors();
        Granularity granularity = enumValue(query.granularity(), Granularity.WEEK, Granularity.class, "granularity",
                errors);
        HeatmapTable.Sort sort = enumValue(query.sort(), HeatmapTable.Sort.LOAD_DESC, HeatmapTable.Sort.class, "sort",
                errors);
        Level level = enumValue(query.level(), null, Level.class, "level", errors);
        int count = query.columns() == null ? HeatmapWindow.defaultCount(granularity) : query.columns();
        if (count < 1 || count > HeatmapWindow.MAX_COUNT) {
            errors.add("columns", "out_of_range");
        }
        if (query.page() < 0) {
            errors.add("page", "out_of_range");
        }
        if (query.size() < 1 || query.size() > MAX_PAGE_SIZE) {
            errors.add("size", "out_of_range");
        }
        if (query.q() != null && query.q().length() > MAX_SEARCH_LENGTH) {
            errors.add("q", "too_long");
        }
        errors.throwIfAny();

        LocalDate today = today();
        HeatmapWindow window = HeatmapWindow.of(granularity, query.from() == null ? today : query.from(), count);
        ResourceThresholds thresholds = settings.current();
        LocalDate weekFrom = HeatmapWindow.weekStart(today);
        LocalDate weekTo = weekFrom.plusDays(6);

        List<EmployeeCard> people = employeeList.allActiveCards(query.q(), query.orgUnitId(), query.includeSubUnits());
        LocalDate loadFrom = window.from().isBefore(weekFrom) ? window.from() : weekFrom;
        LocalDate loadTo = window.to().isAfter(weekTo) ? window.to() : weekTo;
        Map<UUID, EmployeeLoad> loads = loadsOf(people, loadFrom, loadTo);

        List<Row> all = HeatmapTable.rows(people, loads, window);
        int overloadedInWindow = (int) all.stream().filter(Row::overloaded).count();
        int overloadedNow = (int) people.stream().filter(p -> {
            EmployeeLoad load = loads.get(p.id());
            return load != null && load.within(weekFrom, weekTo).overloaded();
        }).count();

        List<Row> shown = HeatmapTable.sorted(HeatmapTable.onLevel(all, thresholds, level), sort);
        int from = (int) Math.min((long) query.page() * query.size(), shown.size());
        int to = Math.min(from + query.size(), shown.size());
        List<HeatmapResponse.Row> items = shown.subList(from, to).stream()
                .map(row -> new HeatmapResponse.Row(row.employee(), row.cells(), row.peak())).toList();
        return new HeatmapResponse(window.from(), window.to(), granularity.name(),
                window.columns().stream().map(c -> new HeatmapResponse.Column(c.from(), c.to())).toList(), items,
                shown.size(), query.page(), query.size(),
                new HeatmapResponse.Summary(people.size(), overloadedNow, overloadedInWindow),
                new HeatmapResponse.Thresholds(thresholds.benchPercent(), thresholds.nearFullPercent(),
                        thresholds.endingWeeks()));
    }

    /**
     * The detail behind a heatmap cell: the Employee's load over {@code [from, to]} and the allocations in it.
     *
     * @param to null: six days after {@code from} (one week)
     */
    @Transactional(readOnly = true)
    public CellDetailResponse cell(CurrentAccount caller, UUID employeeId, LocalDate from, LocalDate to) {
        accessScopes.scopeOf(caller).require(Permission.RESOURCE_VIEW);
        FieldErrors errors = new FieldErrors();
        if (from == null) {
            errors.add("from", "required");
        }
        LocalDate end = to == null && from != null ? from.plusDays(6) : to;
        if (from != null && end.isBefore(from)) {
            errors.add("to", "before_start");
        } else if (from != null && from.plusDays(MAX_DETAIL_DAYS).isBefore(end)) {
            errors.add("to", "out_of_range");
        }
        errors.throwIfAny();

        Employee employee = employees.findById(employeeId).filter(Employee::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "employee.not_found", "Employee not found"));
        EmployeeCard card = employeeCards.cards(Set.of(employeeId)).get(employeeId);
        CatalogItemRef position = catalogs.findItems(Catalog.POSITION, Set.of(employee.getPositionId()))
                .get(employee.getPositionId());

        List<ProjectAllocation> touching = allocations
                .findByEmployeeIdInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(Set.of(employeeId), end, from)
                .stream().sorted(Comparator.comparing(ProjectAllocation::getStartDate)
                        .thenComparing(ProjectAllocation::getId)).toList();
        EmployeeLoad load = calculator.load(employeeId, touching.stream().map(ResourceHeatmapService::planned).toList(),
                from, end);
        ProjectAllocation next = touching.isEmpty() ? allocations
                .findFirstByEmployeeIdAndStartDateGreaterThanOrderByStartDateAsc(employeeId, end).orElse(null) : null;

        Set<UUID> projectIds = new HashSet<>();
        touching.forEach(a -> projectIds.add(a.getProjectId()));
        if (next != null) {
            projectIds.add(next.getProjectId());
        }
        Map<UUID, Project> named = projects.findAllById(projectIds).stream()
                .collect(Collectors.toMap(Project::getId, Function.identity()));
        Set<UUID> roleIds = new HashSet<>();
        touching.forEach(a -> roleIds.add(a.getProjectRoleId()));
        if (next != null) {
            roleIds.add(next.getProjectRoleId());
        }
        Map<UUID, CatalogItemRef> roles = catalogs.findItems(Catalog.PROJECT_ROLE, roleIds);
        LocalDate today = today();
        return new CellDetailResponse(card, position == null ? null : position.name(), from, end, load.peak(),
                load.overloaded(), LoadViews.of(load.periods(), named, null),
                touching.stream().map(a -> ref(a, named, roles, today)).toList(),
                next == null ? null : ref(next, named, roles, today));
    }

    private Map<UUID, EmployeeLoad> loadsOf(List<EmployeeCard> people, LocalDate from, LocalDate to) {
        if (people.isEmpty()) {
            return Map.of();
        }
        Set<UUID> ids = people.stream().map(EmployeeCard::id).collect(Collectors.toSet());
        List<PlannedAllocation> planned = allocations
                .findByEmployeeIdInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(ids, to, from).stream()
                .map(ResourceHeatmapService::planned).toList();
        return calculator.loads(planned, from, to);
    }

    private static AllocationRef ref(ProjectAllocation a, Map<UUID, Project> named, Map<UUID, CatalogItemRef> roles,
            LocalDate today) {
        Project project = named.get(a.getProjectId());
        String status = a.getEndDate().isBefore(today) ? "ENDED" : a.getStartDate().isAfter(today) ? "UPCOMING"
                : "RUNNING";
        return new AllocationRef(a.getId(), a.getProjectId(), project == null ? null : project.getCode(),
                project == null ? null : project.getName(), roles.get(a.getProjectRoleId()), a.getPercent(),
                a.getStartDate(), a.getEndDate(), status);
    }

    private static PlannedAllocation planned(ProjectAllocation a) {
        return new PlannedAllocation(a.getId(), a.getEmployeeId(), a.getProjectId(), a.getPercent(), a.getStartDate(),
                a.getEndDate());
    }

    private static <E extends Enum<E>> E enumValue(String value, E ifMissing, Class<E> type, String field,
            FieldErrors errors) {
        if (value == null || value.isBlank()) {
            return ifMissing;
        }
        return Arrays.stream(type.getEnumConstants()).filter(e -> e.name().equals(value)).findFirst()
                .orElseGet(() -> {
                    errors.add(field, "invalid");
                    return ifMissing;
                });
    }

    private LocalDate today() {
        return LocalDate.ofInstant(clock.instant(), ApprovalRequestService.COMPANY_ZONE);
    }
}
