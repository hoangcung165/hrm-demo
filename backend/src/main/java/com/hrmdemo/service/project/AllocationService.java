package com.hrmdemo.service.project;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.project.AllocationCandidate;
import com.hrmdemo.dto.project.AllocationEndRequest;
import com.hrmdemo.dto.project.AllocationListResponse;
import com.hrmdemo.dto.project.AllocationRequest;
import com.hrmdemo.dto.project.AllocationResponse;
import com.hrmdemo.dto.project.AllocationSaveResponse;
import com.hrmdemo.dto.project.AllocationUpdateRequest;
import com.hrmdemo.dto.project.LoadPart;
import com.hrmdemo.dto.project.LoadPeriodView;
import com.hrmdemo.dto.project.ProjectMembers;
import com.hrmdemo.dto.project.TryAllocationRequest;
import com.hrmdemo.dto.project.TryAllocationResponse;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.project.Project;
import com.hrmdemo.entity.project.ProjectAllocation;
import com.hrmdemo.entity.project.ProjectStatus;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.project.ProjectAllocationRepository;
import com.hrmdemo.repository.project.ProjectRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.allocation.AllocationCalculator;
import com.hrmdemo.service.allocation.EmployeeLoad;
import com.hrmdemo.service.allocation.LoadPeriod;
import com.hrmdemo.service.allocation.PlannedAllocation;
import com.hrmdemo.service.allocation.TryAllocationResult;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeListService;
import com.hrmdemo.service.employee.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phân bổ (HRM-15): the allocations of a project, Thử phân bổ, and the head counts the project list shows.
 * <p>
 * Reading needs PROJECT_VIEW; every change needs the right to edit the project ({@link ProjectService#canEdit}) and a
 * project that is not closed. An allocation lies within its project's dates, and an Employee has at most one
 * allocation per day in a project. Saving an allocation that overloads someone is allowed: the response carries the
 * check (decision 1 of the HRM-15 design spec: warn, do not block). The Tải phân bổ is always computed across every
 * project by {@link AllocationCalculator}, from today on for allocations that have not ended.
 */
@Service
@RequiredArgsConstructor
public class AllocationService {

    /** The company's time zone: the day "today" is (ADR 0003, one Pháp nhân in Việt Nam). */
    static final ZoneId COMPANY_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final int CANDIDATES = 20;

    private final AllocationCalculator calculator = new AllocationCalculator();

    private final ProjectAllocationRepository allocations;
    private final ProjectRepository projects;
    private final EmployeeService employees;
    private final EmployeeListService employeeList;
    private final CatalogService catalogs;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    /** Status of an allocation on a day. */
    enum AllocationStatus {
        UPCOMING, RUNNING, ENDED
    }

    // --- reading ---

    /** The allocations on the "Thành viên" tab (running and upcoming) or on the "Phân bổ đã kết thúc" tab. */
    @Transactional(readOnly = true)
    public AllocationListResponse list(CurrentAccount caller, UUID projectId, boolean ended) {
        accessScopes.scopeOf(caller).require(Permission.PROJECT_VIEW);
        Project project = project(projectId);
        LocalDate today = today();
        List<ProjectAllocation> all = allocations.findByProjectId(project.getId());
        List<ProjectAllocation> current = all.stream().filter(a -> !a.getEndDate().isBefore(today)).toList();
        List<ProjectAllocation> shown = ended
                ? all.stream().filter(a -> a.getEndDate().isBefore(today))
                        .sorted(Comparator.comparing(ProjectAllocation::getEndDate).reversed()).toList()
                : current.stream().sorted(Comparator.comparing(ProjectAllocation::getStartDate)).toList();
        Views views = views(shown, today);
        List<AllocationResponse> items = shown.stream().map(a -> views.response(a)).toList();
        if (!ended) {
            items = items.stream().sorted(Comparator.comparing(AllocationResponse::startDate)
                    .thenComparing(r -> r.employee() == null ? "" : r.employee().fullName())).toList();
        }
        return new AllocationListResponse(items, current.size(), all.size() - current.size());
    }

    /** Employees to allocate, by name or code: active ones, each with their load today and their place here. */
    @Transactional(readOnly = true)
    public List<AllocationCandidate> candidates(CurrentAccount caller, UUID projectId, String q) {
        Project project = editable(caller, projectId);
        LocalDate today = today();
        List<EmployeeCard> cards = employeeList.activeCards(q, null, CANDIDATES);
        Set<UUID> ids = cards.stream().map(EmployeeCard::id).collect(Collectors.toSet());
        List<ProjectAllocation> theirs = ids.isEmpty() ? List.of()
                : allocations.findByEmployeeIdInAndEndDateGreaterThanEqual(ids, today);
        Map<UUID, EmployeeLoad> loads = loads(theirs, today, today);
        Map<UUID, LocalDate> inProject = new HashMap<>();
        theirs.stream().filter(a -> a.getProjectId().equals(project.getId()))
                .forEach(a -> inProject.merge(a.getEmployeeId(), a.getStartDate(),
                        (x, y) -> x.isBefore(y) ? x : y));
        return cards.stream().map(card -> new AllocationCandidate(card,
                Optional.ofNullable(loads.get(card.id())).map(l -> l.on(today)).orElse(0), inProject.get(card.id())))
                .toList();
    }

    /** Head counts of each project's running and upcoming allocations; projects without any are left out. */
    @Transactional(readOnly = true)
    public Map<UUID, ProjectMembers> members(Collection<UUID> projectIds) {
        if (projectIds.isEmpty()) {
            return Map.of();
        }
        LocalDate today = today();
        List<ProjectAllocation> current = allocations.findByProjectIdIn(projectIds).stream()
                .filter(a -> !a.getEndDate().isBefore(today)).toList();
        return members(current, today);
    }

    /** The projects with someone Quá tải from today on. */
    @Transactional(readOnly = true)
    public Set<UUID> projectsWithOverload() {
        LocalDate today = today();
        Map<UUID, ProjectMembers> all = members(allocations.findByEndDateGreaterThanEqual(today), today);
        return all.entrySet().stream().filter(e -> e.getValue().overloaded() > 0).map(Map.Entry::getKey)
                .collect(Collectors.toSet());
    }

    // --- Thử phân bổ ---

    @Transactional(readOnly = true)
    public TryAllocationResponse tryAllocation(CurrentAccount caller, UUID projectId, TryAllocationRequest request) {
        Project project = editable(caller, projectId);
        UUID allocationId = request.allocationId();
        UUID employeeId = request.employeeId();
        if (allocationId != null) {
            employeeId = own(project, allocationId).getEmployeeId();
        }
        FieldErrors errors = new FieldErrors();
        if (employeeId == null) {
            errors.add("employeeId", "required");
        }
        Fields fields = fields(project, request.percent(), request.startDate(), request.endDate(), errors);
        errors.throwIfAny();
        UUID id = allocationId != null ? allocationId : UUID.randomUUID();
        return check(new PlannedAllocation(id, employeeId, project.getId(), fields.percent(), fields.start(),
                fields.end()), project.getId());
    }

    // --- changes ---

    @Transactional
    public AllocationSaveResponse create(CurrentAccount caller, UUID projectId, AllocationRequest request) {
        Project project = changeable(caller, projectId);
        FieldErrors errors = new FieldErrors();
        if (request.employeeId() == null) {
            errors.add("employeeId", "required");
        }
        if (request.projectRoleId() == null) {
            errors.add("projectRoleId", "required");
        }
        Fields fields = fields(project, request.percent(), request.startDate(), request.endDate(), errors);
        errors.throwIfAny();
        if (employees.activeIds(Set.of(request.employeeId())).isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "allocation.employee_not_found",
                    "The Employee is not an active Employee").with("field", "employeeId");
        }
        requireProjectRole(request.projectRoleId(), null);
        requireNoOverlapInProject(project.getId(), request.employeeId(), null, fields);
        ProjectAllocation saved = allocations.save(new ProjectAllocation(project.getId(), request.employeeId(),
                request.projectRoleId(), fields.percent(), fields.start(), fields.end(), clock.instant()));
        return saved(saved);
    }

    @Transactional
    public AllocationSaveResponse update(CurrentAccount caller, UUID projectId, UUID id,
            AllocationUpdateRequest request) {
        Project project = changeable(caller, projectId);
        ProjectAllocation allocation = own(project, id);
        FieldErrors errors = new FieldErrors();
        if (request.projectRoleId() == null) {
            errors.add("projectRoleId", "required");
        }
        Fields fields = fields(project, request.percent(), request.startDate(), request.endDate(), errors);
        errors.throwIfAny();
        requireProjectRole(request.projectRoleId(), allocation.getProjectRoleId());
        requireNoOverlapInProject(project.getId(), allocation.getEmployeeId(), allocation.getId(), fields);
        allocation.change(request.projectRoleId(), fields.percent(), fields.start(), fields.end(), clock.instant());
        return saved(allocation);
    }

    /** Kết thúc sớm: the allocation's last day moves earlier, not before its first day. */
    @Transactional
    public AllocationSaveResponse endEarly(CurrentAccount caller, UUID projectId, UUID id,
            AllocationEndRequest request) {
        Project project = changeable(caller, projectId);
        ProjectAllocation allocation = own(project, id);
        FieldErrors errors = new FieldErrors();
        LocalDate end = request.endDate();
        if (end == null) {
            errors.add("endDate", "required");
        } else if (end.isBefore(allocation.getStartDate())) {
            errors.add("endDate", "before_start");
        } else if (!end.isBefore(allocation.getEndDate())) {
            errors.add("endDate", "not_earlier");
        }
        errors.throwIfAny();
        allocation.moveDates(allocation.getStartDate(), end, clock.instant());
        return saved(allocation);
    }

    /** Only an allocation that has not started can be deleted; one that has keeps its history and is ended early. */
    @Transactional
    public void delete(CurrentAccount caller, UUID projectId, UUID id) {
        Project project = changeable(caller, projectId);
        ProjectAllocation allocation = own(project, id);
        if (!allocation.getStartDate().isAfter(today())) {
            throw new ApiException(HttpStatus.CONFLICT, "allocation.started",
                    "An allocation that has started can only be ended early");
        }
        allocations.delete(allocation);
    }

    /**
     * After a project's dates or status changed: allocations are cut to its dates (one with no day left goes), and
     * on closing, running allocations end today and upcoming ones go.
     */
    @Transactional
    void fitToProject(Project project, ProjectStatus previousStatus) {
        LocalDate today = today();
        for (ProjectAllocation a : allocations.findByProjectId(project.getId())) {
            LocalDate start = a.getStartDate().isBefore(project.getStartDate()) ? project.getStartDate()
                    : a.getStartDate();
            LocalDate end = a.getEndDate().isAfter(project.getEndDate()) ? project.getEndDate() : a.getEndDate();
            if (project.getStatus() == ProjectStatus.CLOSED && previousStatus != ProjectStatus.CLOSED) {
                if (start.isAfter(today)) {
                    allocations.delete(a);
                    continue;
                }
                if (end.isAfter(today)) {
                    end = today;
                }
            }
            if (end.isBefore(start)) {
                allocations.delete(a);
            } else if (!start.equals(a.getStartDate()) || !end.equals(a.getEndDate())) {
                a.moveDates(start, end, clock.instant());
            }
        }
    }

    // --- rules ---

    /** The checked percent and dates of an allocation; a failing field is null. */
    private record Fields(int percent, LocalDate start, LocalDate end) {
    }

    private static Fields fields(Project project, Integer percent, LocalDate start, LocalDate end,
            FieldErrors errors) {
        if (percent == null) {
            errors.add("percent", "required");
        } else if (percent < 1 || percent > 100) {
            errors.add("percent", "out_of_range");
        }
        if (start == null) {
            errors.add("startDate", "required");
        } else if (start.isBefore(project.getStartDate()) || start.isAfter(project.getEndDate())) {
            errors.add("startDate", "outside_project");
        }
        if (end == null) {
            errors.add("endDate", "required");
        } else if (start != null && end.isBefore(start)) {
            errors.add("endDate", "before_start");
        } else if (end.isAfter(project.getEndDate()) || end.isBefore(project.getStartDate())) {
            errors.add("endDate", "outside_project");
        }
        return new Fields(percent == null ? 0 : percent, start, end);
    }

    /** An active Vai trò dự án; the one the allocation already has stays allowed after it was deactivated. */
    private void requireProjectRole(UUID roleId, UUID current) {
        CatalogItemRef role = catalogs.findItem(Catalog.PROJECT_ROLE, roleId).orElseThrow(
                () -> new ApiException(HttpStatus.BAD_REQUEST, "allocation.project_role_not_found",
                        "No such Vai trò dự án").with("field", "projectRoleId"));
        if (!role.active() && !roleId.equals(current)) {
            throw new ApiException(HttpStatus.CONFLICT, "allocation.project_role_inactive",
                    "The Vai trò dự án is inactive").with("field", "projectRoleId");
        }
    }

    /** One allocation per person and day in a project: change the existing one instead. */
    private void requireNoOverlapInProject(UUID projectId, UUID employeeId, UUID exceptId, Fields fields) {
        allocations.findByProjectId(projectId).stream()
                .filter(a -> a.getEmployeeId().equals(employeeId) && !a.getId().equals(exceptId))
                .filter(a -> !a.getStartDate().isAfter(fields.end()) && !a.getEndDate().isBefore(fields.start()))
                .findFirst()
                .ifPresent(a -> {
                    throw new ApiException(HttpStatus.CONFLICT, "allocation.already_in_project",
                            "The Employee already has an allocation in this project on some of these days")
                            .with("allocationId", a.getId()).with("startDate", a.getStartDate())
                            .with("endDate", a.getEndDate());
                });
    }

    private Project project(UUID projectId) {
        return projects.findById(projectId).orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "project.not_found", "Project not found"));
    }

    /** The project, when the caller may edit it. */
    private Project editable(CurrentAccount caller, UUID projectId) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.PROJECT_VIEW);
        Project project = project(projectId);
        if (!ProjectService.canEdit(scope, project)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "auth.forbidden", "Access is denied");
        }
        return project;
    }

    /** The project, when the caller may edit it and it takes changes (not closed). */
    private Project changeable(CurrentAccount caller, UUID projectId) {
        Project project = editable(caller, projectId);
        if (project.getStatus() == ProjectStatus.CLOSED) {
            throw new ApiException(HttpStatus.CONFLICT, "project.closed",
                    "A closed project takes no allocation changes; reopen it first");
        }
        return project;
    }

    private ProjectAllocation own(Project project, UUID id) {
        return allocations.findById(id).filter(a -> a.getProjectId().equals(project.getId())).orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "allocation.not_found", "No such allocation here"));
    }

    // --- computing ---

    private AllocationSaveResponse saved(ProjectAllocation allocation) {
        LocalDate today = today();
        TryAllocationResponse check = check(planned(allocation), allocation.getProjectId());
        return new AllocationSaveResponse(views(List.of(allocation), today).response(allocation), check);
    }

    /** The calculator's check of one allocation, against everything else of its Employee. */
    private TryAllocationResponse check(PlannedAllocation candidate, UUID projectId) {
        LocalDate windowFrom = candidate.from().withDayOfMonth(1);
        List<ProjectAllocation> others = allocations.findByEmployeeIdInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                Set.of(candidate.employeeId()), candidate.to(), windowFrom);
        TryAllocationResult result = calculator.tryAllocation(others.stream().map(AllocationService::planned).toList(),
                candidate, windowFrom, candidate.to());
        Map<UUID, Project> named = projectsOf(result.load().periods());
        EmployeeCard employee = employees.cards(Set.of(candidate.employeeId())).get(candidate.employeeId());
        return new TryAllocationResponse(employee, result.peak(), result.overloaded(),
                views(result.load().periods(), named, projectId),
                views(result.overloadedPeriods(), named, projectId),
                result.suggestedMaxPercent().isPresent() ? result.suggestedMaxPercent().getAsInt() : null,
                result.suggestedStart().orElse(null));
    }

    /** Everything needed to show some allocations: their Employees' loads, cards, roles and the projects named. */
    private Views views(List<ProjectAllocation> shown, LocalDate today) {
        if (shown.isEmpty()) {
            return new Views(Map.of(), Map.of(), Map.of(), Map.of(), today);
        }
        Set<UUID> people = shown.stream().map(ProjectAllocation::getEmployeeId).collect(Collectors.toSet());
        LocalDate from = shown.stream().map(a -> range(a, today)[0]).min(Comparator.naturalOrder()).orElseThrow();
        LocalDate to = shown.stream().map(ProjectAllocation::getEndDate).max(Comparator.naturalOrder()).orElseThrow();
        List<ProjectAllocation> theirs = allocations
                .findByEmployeeIdInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(people, to, from);
        Map<UUID, EmployeeLoad> loads = loads(theirs, from, to);
        Map<UUID, Project> named = projects.findAllById(theirs.stream().map(ProjectAllocation::getProjectId)
                .collect(Collectors.toSet())).stream().collect(Collectors.toMap(Project::getId, Function.identity()));
        Map<UUID, CatalogItemRef> roles = catalogs.findItems(Catalog.PROJECT_ROLE,
                shown.stream().map(ProjectAllocation::getProjectRoleId).collect(Collectors.toSet()));
        return new Views(loads, employees.cards(people), roles, named, today);
    }

    private record Views(Map<UUID, EmployeeLoad> loads, Map<UUID, EmployeeCard> cards,
            Map<UUID, CatalogItemRef> roles, Map<UUID, Project> projects, LocalDate today) {

        AllocationResponse response(ProjectAllocation a) {
            LocalDate[] range = range(a, today);
            EmployeeLoad load = loads.get(a.getEmployeeId());
            EmployeeLoad inRange = load == null ? null : load.within(range[0], range[1]);
            List<LoadPeriodView> overloaded = inRange == null ? List.of()
                    : AllocationService.views(inRange.overloadedPeriods(), projects, a.getProjectId());
            return new AllocationResponse(a.getId(), a.getProjectId(), cards.get(a.getEmployeeId()),
                    roles.get(a.getProjectRoleId()), a.getPercent(), a.getStartDate(), a.getEndDate(),
                    status(a, today).name(), inRange == null ? a.getPercent() : inRange.peak(), overloaded);
        }
    }

    /** The days whose load counts for an allocation: from today on until it has ended, all of them after. */
    private static LocalDate[] range(ProjectAllocation a, LocalDate today) {
        if (a.getEndDate().isBefore(today) || !a.getStartDate().isBefore(today)) {
            return new LocalDate[] {a.getStartDate(), a.getEndDate()};
        }
        return new LocalDate[] {today, a.getEndDate()};
    }

    static AllocationStatus status(ProjectAllocation a, LocalDate today) {
        if (a.getEndDate().isBefore(today)) {
            return AllocationStatus.ENDED;
        }
        return a.getStartDate().isAfter(today) ? AllocationStatus.UPCOMING : AllocationStatus.RUNNING;
    }

    /** Head counts per project, from allocations that have not ended (with every other allocation of those people). */
    private Map<UUID, ProjectMembers> members(List<ProjectAllocation> current, LocalDate today) {
        if (current.isEmpty()) {
            return Map.of();
        }
        Set<UUID> people = current.stream().map(ProjectAllocation::getEmployeeId).collect(Collectors.toSet());
        List<ProjectAllocation> theirs = allocations.findByEmployeeIdInAndEndDateGreaterThanEqual(people, today);
        LocalDate to = theirs.stream().map(ProjectAllocation::getEndDate).max(Comparator.naturalOrder())
                .orElse(today);
        Map<UUID, EmployeeLoad> loads = loads(theirs, today, to);
        Map<UUID, Set<UUID>> running = new HashMap<>();
        Map<UUID, Set<UUID>> upcoming = new HashMap<>();
        Map<UUID, Set<UUID>> overloaded = new HashMap<>();
        for (ProjectAllocation a : current) {
            UUID p = a.getProjectId();
            (status(a, today) == AllocationStatus.RUNNING ? running : upcoming)
                    .computeIfAbsent(p, k -> new HashSet<>()).add(a.getEmployeeId());
            LocalDate[] range = range(a, today);
            EmployeeLoad load = loads.get(a.getEmployeeId());
            if (load != null && load.within(range[0], range[1]).overloaded()) {
                overloaded.computeIfAbsent(p, k -> new HashSet<>()).add(a.getEmployeeId());
            }
        }
        Map<UUID, ProjectMembers> result = new HashMap<>();
        Set<UUID> projectIds = current.stream().map(ProjectAllocation::getProjectId).collect(Collectors.toSet());
        for (UUID p : projectIds) {
            Set<UUID> run = running.getOrDefault(p, Set.of());
            Set<UUID> next = new HashSet<>(upcoming.getOrDefault(p, Set.of()));
            next.removeAll(run);
            result.put(p, new ProjectMembers(run.size(), next.size(), overloaded.getOrDefault(p, Set.of()).size()));
        }
        return result;
    }

    private Map<UUID, EmployeeLoad> loads(List<ProjectAllocation> theirs, LocalDate from, LocalDate to) {
        if (theirs.isEmpty() || to.isBefore(from)) {
            return Map.of();
        }
        return calculator.loads(theirs.stream().map(AllocationService::planned).toList(), from, to);
    }

    private Map<UUID, Project> projectsOf(List<LoadPeriod> periods) {
        Set<UUID> ids = new HashSet<>();
        periods.forEach(p -> p.parts().forEach(part -> ids.add(part.projectId())));
        return projects.findAllById(ids).stream().collect(Collectors.toMap(Project::getId, Function.identity()));
    }

    private static List<LoadPeriodView> views(List<LoadPeriod> periods, Map<UUID, Project> named, UUID thisProject) {
        List<LoadPeriodView> views = new ArrayList<>();
        for (LoadPeriod period : periods) {
            List<LoadPart> parts = period.parts().stream().map(part -> {
                Project p = named.get(part.projectId());
                return new LoadPart(part.projectId(), p == null ? null : p.getCode(), p == null ? null : p.getName(),
                        part.percent(), part.projectId().equals(thisProject));
            }).toList();
            views.add(new LoadPeriodView(period.from(), period.to(), period.totalPercent(), period.overloaded(), parts));
        }
        return views;
    }

    private static PlannedAllocation planned(ProjectAllocation a) {
        return new PlannedAllocation(a.getId(), a.getEmployeeId(), a.getProjectId(), a.getPercent(), a.getStartDate(),
                a.getEndDate());
    }

    private LocalDate today() {
        return LocalDate.ofInstant(clock.instant(), COMPANY_ZONE);
    }
}
