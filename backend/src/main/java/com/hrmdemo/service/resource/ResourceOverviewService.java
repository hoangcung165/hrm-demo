package com.hrmdemo.service.resource;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.resource.AllocationBrief;
import com.hrmdemo.dto.resource.BenchResponse;
import com.hrmdemo.dto.resource.EndingResponse;
import com.hrmdemo.dto.resource.HeatmapResponse;
import com.hrmdemo.dto.resource.OverviewResponse;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.project.Project;
import com.hrmdemo.entity.project.ProjectAllocation;
import com.hrmdemo.entity.project.ProjectStatus;
import com.hrmdemo.repository.project.ProjectAllocationRepository;
import com.hrmdemo.repository.project.ProjectRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.allocation.AllocationCalculator;
import com.hrmdemo.service.allocation.AllocationCalculator.Bucket;
import com.hrmdemo.service.allocation.AllocationCalculator.Granularity;
import com.hrmdemo.service.allocation.EmployeeLoad;
import com.hrmdemo.service.allocation.LoadPeriod;
import com.hrmdemo.service.allocation.PlannedAllocation;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeListService;
import com.hrmdemo.service.project.FieldErrors;
import com.hrmdemo.service.resource.ResourceStats.Ending;
import com.hrmdemo.service.resource.ResourceStats.LevelCounts;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bench, Sắp hết dự án and the Nguồn lực dashboard. Reads the people, their allocations and the thresholds once per
 * call and leaves the decisions to {@link ResourceStats} and {@link HeatmapTable}. Needs RESOURCE_VIEW.
 */
@Service
@RequiredArgsConstructor
public class ResourceOverviewService {

    static final int MAX_PAGE_SIZE = 200;
    /** Rows of each "needs attention" list on the dashboard. */
    static final int ATTENTION_ROWS = 5;

    private final AllocationCalculator calculator = new AllocationCalculator();

    private final EmployeeListService employeeList;
    private final ProjectAllocationRepository allocations;
    private final ProjectRepository projects;
    private final CatalogService catalogs;
    private final ResourceSettingsService settings;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    /**
     * @param from        any day of the period; null: today
     * @param granularity WEEK (default) or MONTH
     */
    public record BenchQuery(LocalDate from, String granularity, UUID orgUnitId, boolean includeSubUnits, int page,
            int size) {
    }

    public record EndingQuery(UUID orgUnitId, boolean includeSubUnits, boolean onlyWithoutNext, int page, int size) {
    }

    @Transactional(readOnly = true)
    public BenchResponse bench(CurrentAccount caller, BenchQuery query) {
        accessScopes.scopeOf(caller).require(Permission.RESOURCE_VIEW);
        FieldErrors errors = new FieldErrors();
        Granularity granularity = enumValue(query.granularity(), Granularity.WEEK, Granularity.class, "granularity",
                errors);
        checkPaging(errors, query.page(), query.size());
        errors.throwIfAny();

        ResourceThresholds thresholds = settings.current();
        HeatmapWindow period = HeatmapWindow.of(granularity, query.from() == null ? today() : query.from(), 1);
        List<EmployeeCard> people = employeeList.allActiveCards(null, query.orgUnitId(), query.includeSubUnits());
        Map<UUID, EmployeeLoad> loads = loadsOf(people, period.from(), period.to());

        List<HeatmapTable.Row> benched = HeatmapTable.sorted(HeatmapTable.onLevel(
                HeatmapTable.rows(people, loads, period), thresholds, ResourceThresholds.Level.BENCH),
                HeatmapTable.Sort.LOAD_ASC);
        int noAllocation = (int) benched.stream().filter(r -> r.peak() == 0).count();
        List<HeatmapTable.Row> page = page(benched, query.page(), query.size());

        Set<UUID> ids = page.stream().map(r -> r.employee().id()).collect(Collectors.toSet());
        Map<UUID, List<ProjectAllocation>> history = ids.isEmpty() ? Map.of()
                : allocations.findByEmployeeIdIn(ids).stream().collect(Collectors.groupingBy(
                        ProjectAllocation::getEmployeeId));
        Names names = names(history.values().stream().flatMap(Collection::stream).toList());

        List<BenchResponse.Row> items = page.stream().map(row -> {
            List<ProjectAllocation> own = history.getOrDefault(row.employee().id(), List.of());
            ProjectAllocation next = own.stream().filter(a -> a.getStartDate().isAfter(period.to()))
                    .min(Comparator.comparing(ProjectAllocation::getStartDate).thenComparing(ProjectAllocation::getId))
                    .orElse(null);
            ProjectAllocation latest = own.stream().filter(a -> !a.getStartDate().isAfter(period.to()))
                    .max(Comparator.comparing(ProjectAllocation::getEndDate).thenComparing(ProjectAllocation::getId))
                    .orElse(null);
            return new BenchResponse.Row(row.employee(), row.peak(), names.brief(next), names.brief(latest));
        }).toList();
        return new BenchResponse(period.from(), period.to(), granularity.name(), items, benched.size(),
                query.page(), query.size(), new BenchResponse.Summary(noAllocation, benched.size() - noAllocation),
                thresholdsOf(thresholds));
    }

    @Transactional(readOnly = true)
    public EndingResponse ending(CurrentAccount caller, EndingQuery query) {
        accessScopes.scopeOf(caller).require(Permission.RESOURCE_VIEW);
        FieldErrors errors = new FieldErrors();
        checkPaging(errors, query.page(), query.size());
        errors.throwIfAny();

        ResourceThresholds thresholds = settings.current();
        LocalDate today = today();
        List<EmployeeCard> people = employeeList.allActiveCards(null, query.orgUnitId(), query.includeSubUnits());
        Map<UUID, EmployeeCard> cards = people.stream().collect(Collectors.toMap(EmployeeCard::id,
                Function.identity()));
        List<ProjectAllocation> current = currentAllocations(cards.keySet(), today);
        List<Ending> endings = ResourceStats.endingSoon(current.stream().map(ResourceOverviewService::planned).toList(),
                today, thresholds.endingWeeks());
        int withoutNext = (int) endings.stream().filter(Ending::withoutNext).count();
        List<Ending> shown = query.onlyWithoutNext() ? endings.stream().filter(Ending::withoutNext).toList()
                : endings;
        List<Ending> page = page(shown, query.page(), query.size());

        Map<UUID, ProjectAllocation> byId = current.stream().collect(Collectors.toMap(ProjectAllocation::getId,
                Function.identity()));
        Names names = names(current);
        List<EndingResponse.Row> items = page.stream().map(e -> new EndingResponse.Row(
                cards.get(e.allocation().employeeId()), names.brief(byId.get(e.allocation().id())), e.daysLeft(),
                e.loadAfter(), e.next() == null ? null : names.brief(byId.get(e.next().id())), e.withoutNext()))
                .toList();
        return new EndingResponse(thresholds.endingWeeks(), items, shown.size(), query.page(), query.size(),
                new EndingResponse.Summary(endings.size(), withoutNext));
    }

    @Transactional(readOnly = true)
    public OverviewResponse overview(CurrentAccount caller, LocalDate week, UUID orgUnitId, boolean includeSubUnits) {
        accessScopes.scopeOf(caller).require(Permission.RESOURCE_VIEW);
        ResourceThresholds thresholds = settings.current();
        LocalDate today = today();
        HeatmapWindow window = HeatmapWindow.of(Granularity.WEEK, week == null ? today : week,
                HeatmapWindow.DEFAULT_WEEKS);
        LocalDate weekFrom = window.from();
        LocalDate weekTo = weekFrom.plusDays(6);

        List<EmployeeCard> people = employeeList.allActiveCards(null, orgUnitId, includeSubUnits);
        Map<UUID, EmployeeCard> cards = people.stream().collect(Collectors.toMap(EmployeeCard::id,
                Function.identity()));
        List<ProjectAllocation> current = currentAllocations(cards.keySet(), weekFrom);
        List<PlannedAllocation> planned = current.stream().map(ResourceOverviewService::planned).toList();
        Map<UUID, EmployeeLoad> loads = calculator.loads(planned, weekFrom, window.to());

        // Per person: the highest load of each of the 12 weeks.
        Map<UUID, List<Integer>> weekly = new HashMap<>();
        for (EmployeeCard person : people) {
            EmployeeLoad load = loads.getOrDefault(person.id(), new EmployeeLoad(person.id(), List.of()));
            weekly.put(person.id(), calculator.buckets(load, Granularity.WEEK, weekFrom, window.to()).stream()
                    .map(Bucket::peakPercent).toList());
        }
        List<Integer> thisWeek = people.stream().map(p -> weekly.get(p.id()).get(0)).toList();
        LevelCounts levels = ResourceStats.countLevels(thisWeek, thresholds);
        List<HeatmapWindow.Column> columns = window.columns();
        List<OverviewResponse.WeekLevels> weeks = new ArrayList<>();
        for (int i = 0; i < columns.size(); i++) {
            int column = i;
            LevelCounts counts = ResourceStats.countLevels(people.stream().map(p -> weekly.get(p.id()).get(column))
                    .toList(), thresholds);
            weeks.add(new OverviewResponse.WeekLevels(columns.get(i).from(), columns.get(i).to(), levelsOf(counts)));
        }

        List<Ending> endings = ResourceStats.endingSoon(
                planned.stream().filter(a -> !a.to().isBefore(today)).toList(), today, thresholds.endingWeeks());
        Names names = names(current);
        Map<UUID, ProjectAllocation> byId = current.stream().collect(Collectors.toMap(ProjectAllocation::getId,
                Function.identity()));

        Map<ProjectStatus, Long> byStatus = projects.findAll().stream()
                .collect(Collectors.groupingBy(Project::getStatus, Collectors.counting()));
        OverviewResponse.Tiles tiles = new OverviewResponse.Tiles(count(byStatus, ProjectStatus.ACTIVE),
                count(byStatus, ProjectStatus.PLANNED), count(byStatus, ProjectStatus.ON_HOLD),
                (int) thisWeek.stream().filter(load -> load > 0).count(), people.size(),
                ResourceStats.averageAllocated(thisWeek).stream().boxed().findFirst().orElse(null), levels.bench(),
                levels.over(), (int) people.stream().filter(p -> weekly.get(p.id()).stream().anyMatch(v -> v > 100))
                        .count(),
                endings.size());

        return new OverviewResponse(weekFrom, weekTo, tiles, levelsOf(levels), weeks,
                projectStaff(current, names, weekly, cards.keySet(), weekFrom, weekTo, window.to()),
                new OverviewResponse.Attention(overloaded(people, weekly, loads, names, weekFrom, window.to()),
                        endings.stream().limit(ATTENTION_ROWS).map(e -> new OverviewResponse.EndingEntry(
                                cards.get(e.allocation().employeeId()), names.brief(byId.get(e.allocation().id())),
                                e.daysLeft(), e.loadAfter(), e.withoutNext())).toList()),
                thresholdsOf(thresholds));
    }

    /** Running projects with the people allocated in the week, their full-time equivalents and overloaded members. */
    private List<OverviewResponse.ProjectStaff> projectStaff(List<ProjectAllocation> current, Names names,
            Map<UUID, List<Integer>> weekly, Set<UUID> peopleIds, LocalDate weekFrom, LocalDate weekTo,
            LocalDate windowTo) {
        List<OverviewResponse.ProjectStaff> rows = new ArrayList<>();
        Map<UUID, List<ProjectAllocation>> byProject = current.stream()
                .collect(Collectors.groupingBy(ProjectAllocation::getProjectId));
        for (Project project : names.projects.values()) {
            if (project.getStatus() != ProjectStatus.ACTIVE) {
                continue;
            }
            List<ProjectAllocation> own = byProject.getOrDefault(project.getId(), List.of());
            List<ProjectAllocation> inWeek = own.stream()
                    .filter(a -> !a.getStartDate().isAfter(weekTo) && !a.getEndDate().isBefore(weekFrom)).toList();
            Set<UUID> members = inWeek.stream().map(ProjectAllocation::getEmployeeId).collect(Collectors.toSet());
            int overloaded = (int) members.stream().filter(id -> weekly.get(id).get(0) > 100).count();
            int upcoming = (int) own.stream().filter(a -> a.getStartDate().isAfter(weekTo)
                    && !a.getStartDate().isAfter(windowTo)).map(ProjectAllocation::getEmployeeId).distinct().count();
            if (members.isEmpty() && upcoming == 0) {
                continue;
            }
            double fte = inWeek.stream().mapToInt(ProjectAllocation::getPercent).sum() / 100.0;
            rows.add(new OverviewResponse.ProjectStaff(project.getId(), project.getCode(), project.getName(),
                    members.size(), fte, overloaded, upcoming));
        }
        rows.sort(Comparator.comparingInt(OverviewResponse.ProjectStaff::headcount).reversed()
                .thenComparing(OverviewResponse.ProjectStaff::code));
        return rows;
    }

    private List<OverviewResponse.Overloaded> overloaded(List<EmployeeCard> people, Map<UUID, List<Integer>> weekly,
            Map<UUID, EmployeeLoad> loads, Names names, LocalDate from, LocalDate to) {
        return people.stream()
                .filter(p -> weekly.get(p.id()).stream().anyMatch(v -> v > 100))
                .sorted(Comparator.comparingInt((EmployeeCard p) -> weekly.get(p.id()).stream()
                        .mapToInt(Integer::intValue).max().orElse(0)).reversed().thenComparing(EmployeeCard::code))
                .limit(ATTENTION_ROWS)
                .map(p -> {
                    EmployeeLoad within = loads.get(p.id()).within(from, to);
                    LoadPeriod first = within.overloadedPeriods().get(0);
                    List<String> codes = first.parts().stream().map(part -> names.projectCode(part.projectId()))
                            .toList();
                    return new OverviewResponse.Overloaded(p, within.peak(), first.from(), first.to(), codes);
                }).toList();
    }

    // --- helpers ---

    /** The allocations of these people that have not ended before {@code from}. */
    private List<ProjectAllocation> currentAllocations(Set<UUID> ids, LocalDate from) {
        return ids.isEmpty() ? List.of() : allocations.findByEmployeeIdInAndEndDateGreaterThanEqual(ids, from);
    }

    private Map<UUID, EmployeeLoad> loadsOf(List<EmployeeCard> people, LocalDate from, LocalDate to) {
        if (people.isEmpty()) {
            return Map.of();
        }
        Set<UUID> ids = people.stream().map(EmployeeCard::id).collect(Collectors.toSet());
        return calculator.loads(allocations
                .findByEmployeeIdInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(ids, to, from).stream()
                .map(ResourceOverviewService::planned).toList(), from, to);
    }

    /** Projects and project roles of some allocations, looked up once. */
    private Names names(Collection<ProjectAllocation> some) {
        Set<UUID> projectIds = new LinkedHashSet<>();
        Set<UUID> roleIds = new HashSet<>();
        some.forEach(a -> {
            projectIds.add(a.getProjectId());
            roleIds.add(a.getProjectRoleId());
        });
        Map<UUID, Project> byId = new java.util.LinkedHashMap<>();
        projects.findAllById(projectIds).forEach(p -> byId.put(p.getId(), p));
        return new Names(byId, catalogs.findItems(Catalog.PROJECT_ROLE, roleIds));
    }

    private record Names(Map<UUID, Project> projects, Map<UUID, CatalogItemRef> roles) {

        AllocationBrief brief(ProjectAllocation a) {
            if (a == null) {
                return null;
            }
            Project project = projects.get(a.getProjectId());
            return new AllocationBrief(a.getId(), a.getProjectId(), project == null ? null : project.getCode(),
                    project == null ? null : project.getName(), roles.get(a.getProjectRoleId()), a.getPercent(),
                    a.getStartDate(), a.getEndDate());
        }

        String projectCode(UUID projectId) {
            Project project = projects.get(projectId);
            return project == null ? null : project.getCode();
        }
    }

    private static <T> List<T> page(List<T> all, int page, int size) {
        int from = (int) Math.min((long) page * size, all.size());
        return all.subList(from, Math.min(from + size, all.size()));
    }

    private static void checkPaging(FieldErrors errors, int page, int size) {
        if (page < 0) {
            errors.add("page", "out_of_range");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            errors.add("size", "out_of_range");
        }
    }

    private static int count(Map<ProjectStatus, Long> byStatus, ProjectStatus status) {
        return byStatus.getOrDefault(status, 0L).intValue();
    }

    private static OverviewResponse.Levels levelsOf(LevelCounts c) {
        return new OverviewResponse.Levels(c.bench(), c.partial(), c.full(), c.over());
    }

    private static HeatmapResponse.Thresholds thresholdsOf(ResourceThresholds t) {
        return new HeatmapResponse.Thresholds(t.benchPercent(), t.nearFullPercent(), t.endingWeeks());
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
