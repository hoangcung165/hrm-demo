package com.hrmdemo.service.project;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.dto.project.ProjectListItem;
import com.hrmdemo.dto.project.ProjectListQuery;
import com.hrmdemo.dto.project.ProjectMembers;
import com.hrmdemo.dto.project.ProjectRequest;
import com.hrmdemo.dto.project.ProjectResponse;
import com.hrmdemo.dto.project.ProjectUnitRef;
import com.hrmdemo.dto.project.ProjectUpdateRequest;
import com.hrmdemo.entity.SearchText;
import com.hrmdemo.entity.project.Project;
import com.hrmdemo.entity.project.Project.ProjectDetails;
import com.hrmdemo.entity.project.ProjectStatus;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.project.ProjectRepository;
import com.hrmdemo.repository.project.ProjectSpecifications;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dự án (HRM-15): the project list, one project, creating and editing them.
 * <p>
 * The head counts on every project come from {@link AllocationService}.
 * Who may do what: {@code PROJECT_VIEW} reads every project (the list is not limited by data scope; projects are
 * company-wide). {@code PROJECT_EDIT} adds projects with the caller's own Employee as PM and edits the projects that
 * Employee manages; {@code PROJECT_EDIT_ALL} ("Quản lý mọi dự án") adds and edits any. The same check decides
 * {@code canEdit} in the responses, so the UI hides what the API refuses. Shorter dates cut the Phân bổ to them and
 * closing ends the running ones today ({@link AllocationService#fitToProject}).
 */
@Service
@RequiredArgsConstructor
public class ProjectService {

    static final int MAX_PAGE_SIZE = 100;
    static final int MAX_SEARCH_LENGTH = 100;
    static final int MAX_NAME = 150;
    static final int MAX_CLIENT = 150;
    /** 15 digits: well above any project, and safe in a JavaScript number. */
    static final long MAX_LABOR_BUDGET = 999_999_999_999_999L;
    static final Set<ProjectStatus> NOT_CLOSED = EnumSet.of(ProjectStatus.PLANNED, ProjectStatus.ACTIVE,
            ProjectStatus.ON_HOLD);

    private static final Pattern CODE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,19}");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s\\p{Z}]+");

    private final ProjectRepository projects;
    private final EmployeeService employees;
    private final OrgUnitService orgUnits;
    private final AccessScopeService accessScopes;
    private final AllocationService allocations;
    private final Clock clock;

    /** One page of projects, newest start first; the code breaks ties. */
    @Transactional(readOnly = true)
    public PageResponse<ProjectListItem> list(CurrentAccount caller, ProjectListQuery query) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.PROJECT_VIEW);
        if (query.page() < 0) {
            throw invalidParameter("page");
        }
        if (query.size() < 1 || query.size() > MAX_PAGE_SIZE) {
            throw invalidParameter("size");
        }
        if (query.mine() && scope.employeeId() == null) {
            return new PageResponse<>(List.of(), 0);
        }
        Page<Project> page = projects.findAll(
                ProjectSpecifications.matching(search(query.q()), statuses(query.status()),
                        query.orgUnitId() == null ? null : Set.of(query.orgUnitId()),
                        query.mine() ? scope.employeeId() : null,
                        query.overloaded() ? allocations.projectsWithOverload() : null),
                PageRequest.of(query.page(), query.size(),
                        Sort.by(Sort.Direction.DESC, "startDate").and(Sort.by("code"))));
        Map<UUID, EmployeeCard> pms = employees.cards(page.getContent().stream()
                .map(Project::getPmEmployeeId).collect(Collectors.toSet()));
        Map<UUID, OrgUnitSummary> units = units();
        Map<UUID, ProjectMembers> members = allocations.members(page.getContent().stream().map(Project::getId)
                .toList());
        return PageResponse.of(page, p -> new ProjectListItem(p.getId(), p.getCode(), p.getName(), p.getClient(),
                pms.get(p.getPmEmployeeId()), unitRef(units.get(p.getOrgUnitId())), p.getStartDate(), p.getEndDate(),
                p.getStatus().name(), canEdit(scope, p), members.getOrDefault(p.getId(), ProjectMembers.NONE)));
    }

    @Transactional(readOnly = true)
    public ProjectResponse get(CurrentAccount caller, UUID id) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.PROJECT_VIEW);
        return response(scope, find(id));
    }

    @Transactional
    public ProjectResponse create(CurrentAccount caller, ProjectRequest request) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.PROJECT_EDIT);
        FieldErrors errors = new FieldErrors();
        String code = code(request.code(), errors);
        ProjectDetails details = details(request.name(), request.client(), request.pmEmployeeId(),
                request.orgUnitId(), request.startDate(), request.endDate(), request.status(), request.laborBudget(),
                errors);
        errors.throwIfAny();
        requirePmAllowed(scope, details.pmEmployeeId());
        requireReferences(details);
        if (projects.existsByCodeIgnoreCase(code)) {
            throw new ApiException(HttpStatus.CONFLICT, "project.code_taken", "Another project has this code")
                    .with("field", "code");
        }
        return response(scope, projects.save(new Project(code, details, clock.instant())));
    }

    @Transactional
    public ProjectResponse update(CurrentAccount caller, UUID id, ProjectUpdateRequest request) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.PROJECT_EDIT);
        Project project = find(id);
        if (!canEdit(scope, project)) {
            throw forbidden();
        }
        FieldErrors errors = new FieldErrors();
        ProjectDetails details = details(request.name(), request.client(), request.pmEmployeeId(),
                request.orgUnitId(), request.startDate(), request.endDate(), request.status(), request.laborBudget(),
                errors);
        errors.throwIfAny();
        if (!details.pmEmployeeId().equals(project.getPmEmployeeId())) {
            requirePmAllowed(scope, details.pmEmployeeId());
        }
        requireReferences(details, project);
        ProjectStatus previousStatus = project.getStatus();
        project.apply(details, clock.instant());
        // Shorter dates cut the allocations; closing ends the running ones today (decision 4 of the design spec).
        allocations.fitToProject(project, previousStatus);
        return response(scope, project);
    }

    /** The PM of a project, for the Luồng phê duyệt (timesheets); empty for an unknown project. */
    @Transactional(readOnly = true)
    public Optional<UUID> projectManagerOf(UUID projectId) {
        return projects.findById(projectId).map(Project::getPmEmployeeId);
    }

    /** Whether the scope may edit the project and its Phân bổ. */
    public static boolean canEdit(AccessScope scope, Project project) {
        return scope.has(Permission.PROJECT_EDIT_ALL)
                || (scope.has(Permission.PROJECT_EDIT) && scope.employeeId() != null
                        && scope.employeeId().equals(project.getPmEmployeeId()));
    }

    Project find(UUID id) {
        return projects.findById(id).orElseThrow(
                () -> new ApiException(HttpStatus.NOT_FOUND, "project.not_found", "Project not found"));
    }

    private ProjectResponse response(AccessScope scope, Project p) {
        EmployeeCard pm = employees.cards(Set.of(p.getPmEmployeeId())).get(p.getPmEmployeeId());
        ProjectUnitRef unit = orgUnits.find(p.getOrgUnitId()).map(ProjectService::unitRef).orElse(null);
        return new ProjectResponse(p.getId(), p.getCode(), p.getName(), p.getClient(), pm, unit, p.getStartDate(),
                p.getEndDate(), p.getStatus().name(), p.getLaborBudget(), canEdit(scope, p),
                allocations.members(List.of(p.getId())).getOrDefault(p.getId(), ProjectMembers.NONE),
                p.getCreatedAt(), p.getUpdatedAt());
    }

    /** Without "Quản lý mọi dự án" the PM is the caller's own Employee. */
    private static void requirePmAllowed(AccessScope scope, UUID pmEmployeeId) {
        if (!scope.has(Permission.PROJECT_EDIT_ALL) && !pmEmployeeId.equals(scope.employeeId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "project.pm_not_self",
                    "Without PROJECT_EDIT_ALL a project's PM is the caller's own Employee").with("field",
                            "pmEmployeeId");
        }
    }

    private void requireReferences(ProjectDetails details) {
        requireReferences(details, null);
    }

    /**
     * The PM is an active Employee and the unit an active one. On an edit, the PM and unit the project already has
     * stay allowed even if they have since left or been deactivated, so the other fields can still be changed.
     */
    private void requireReferences(ProjectDetails details, Project current) {
        boolean samePm = current != null && current.getPmEmployeeId().equals(details.pmEmployeeId());
        if (!samePm && employees.activeIds(Set.of(details.pmEmployeeId())).isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "project.pm_not_found", "The PM is not an active Employee")
                    .with("field", "pmEmployeeId");
        }
        boolean sameUnit = current != null && current.getOrgUnitId().equals(details.orgUnitId());
        Optional<OrgUnitSummary> unit = orgUnits.find(details.orgUnitId());
        if (unit.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "project.org_unit_not_found", "No such unit")
                    .with("field", "orgUnitId");
        }
        if (!sameUnit && !unit.get().active()) {
            throw new ApiException(HttpStatus.CONFLICT, "project.org_unit_inactive", "The unit is inactive")
                    .with("field", "orgUnitId");
        }
    }

    private static String code(String value, FieldErrors errors) {
        String code = value == null ? "" : value.strip();
        if (code.isEmpty()) {
            errors.add("code", "required");
        } else if (code.length() > 20) {
            errors.add("code", "too_long");
        } else if (!CODE.matcher(code).matches()) {
            errors.add("code", "invalid");
        }
        return code;
    }

    private static ProjectDetails details(String name, String client, UUID pmEmployeeId, UUID orgUnitId,
            LocalDate startDate, LocalDate endDate, String status, Long laborBudget, FieldErrors errors) {
        String cleanName = text(name);
        if (cleanName == null) {
            errors.add("name", "required");
        } else if (cleanName.length() > MAX_NAME) {
            errors.add("name", "too_long");
        }
        String cleanClient = text(client);
        if (cleanClient != null && cleanClient.length() > MAX_CLIENT) {
            errors.add("client", "too_long");
        }
        if (pmEmployeeId == null) {
            errors.add("pmEmployeeId", "required");
        }
        if (orgUnitId == null) {
            errors.add("orgUnitId", "required");
        }
        if (startDate == null) {
            errors.add("startDate", "required");
        }
        if (endDate == null) {
            errors.add("endDate", "required");
        } else if (startDate != null && endDate.isBefore(startDate)) {
            errors.add("endDate", "before_start");
        }
        ProjectStatus projectStatus = null;
        if (status == null || status.isBlank()) {
            errors.add("status", "required");
        } else {
            projectStatus = Arrays.stream(ProjectStatus.values()).filter(s -> s.name().equals(status)).findFirst()
                    .orElse(null);
            if (projectStatus == null) {
                errors.add("status", "invalid");
            }
        }
        if (laborBudget != null && (laborBudget < 0 || laborBudget > MAX_LABOR_BUDGET)) {
            errors.add("laborBudget", "out_of_range");
        }
        return new ProjectDetails(cleanName, cleanClient, pmEmployeeId, orgUnitId, startDate, endDate, projectStatus,
                laborBudget);
    }

    /** Trimmed, inner runs of whitespace as one space; null when blank. */
    private static String text(String value) {
        if (value == null) {
            return null;
        }
        String clean = WHITESPACE.matcher(value).replaceAll(" ").strip();
        return clean.isEmpty() ? null : clean;
    }

    private static String search(String q) {
        if (q != null && q.length() > MAX_SEARCH_LENGTH) {
            throw invalidParameter("q");
        }
        return q == null || SearchText.of(q).isEmpty() ? null : SearchText.containsPattern(q);
    }

    /** Comma-separated status names; every status but CLOSED when none is given. */
    private static Set<ProjectStatus> statuses(String value) {
        Set<ProjectStatus> statuses = EnumSet.noneOf(ProjectStatus.class);
        if (value != null) {
            for (String part : value.split(",")) {
                String name = part.strip();
                if (!name.isEmpty()) {
                    statuses.add(Arrays.stream(ProjectStatus.values()).filter(s -> s.name().equals(name))
                            .findFirst().orElseThrow(() -> invalidParameter("status")));
                }
            }
        }
        return statuses.isEmpty() ? NOT_CLOSED : statuses;
    }

    private Map<UUID, OrgUnitSummary> units() {
        return orgUnits.summaries().stream().collect(Collectors.toMap(OrgUnitSummary::id, Function.identity()));
    }

    private static ProjectUnitRef unitRef(OrgUnitSummary unit) {
        return unit == null ? null : new ProjectUnitRef(unit.id(), unit.name(), unit.active());
    }

    private static ApiException invalidParameter(String field) {
        return new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request value is invalid: " + field)
                .with("errors", List.of(Map.of("field", field, "code", "invalid")));
    }

    private static ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "auth.forbidden", "Access is denied");
    }
}
