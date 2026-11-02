package com.hrmdemo.service.project;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeOption;
import com.hrmdemo.dto.leave.LeaveRequestStatus;
import com.hrmdemo.dto.project.CandidateLeave;
import com.hrmdemo.dto.project.CandidateMonth;
import com.hrmdemo.dto.project.CandidatePerson;
import com.hrmdemo.dto.project.CandidateQuery;
import com.hrmdemo.dto.project.CandidateSkill;
import com.hrmdemo.dto.project.ProjectCandidate;
import com.hrmdemo.dto.project.ProjectCandidatesResponse;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.employee.EmployeeSkill;
import com.hrmdemo.entity.leave.LeaveRequest;
import com.hrmdemo.entity.project.Project;
import com.hrmdemo.entity.project.ProjectAllocation;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeSkillRepository;
import com.hrmdemo.repository.leave.LeaveRequestRepository;
import com.hrmdemo.repository.project.ProjectAllocationRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.allocation.AllocationCalculator;
import com.hrmdemo.service.allocation.AllocationCalculator.Granularity;
import com.hrmdemo.service.allocation.CandidateMatch;
import com.hrmdemo.service.allocation.CandidateMatch.Match;
import com.hrmdemo.service.allocation.CandidateMatch.Ranking;
import com.hrmdemo.service.allocation.CandidateMatch.Requirement;
import com.hrmdemo.service.allocation.CandidateMatch.Sort;
import com.hrmdemo.service.allocation.EmployeeLoad;
import com.hrmdemo.service.allocation.PlannedAllocation;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeListService;
import com.hrmdemo.service.employee.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tìm người (HRM-16): who could join a project, by skill and by how much of their time is free.
 * <p>
 * For callers who may edit the project's Phân bổ ({@link ProjectService#canEdit}). The results carry directory data
 * only (name, unit, position, skills with levels, loads and leave dates), so a PM whose data scope is their own
 * team can staff from the whole company without reading a profile. People who meet none of the required skills,
 * Employees who have left and the project's members in the range are left out; the members are counted, because they
 * are edited from the members table. The load is {@link AllocationCalculator}'s, across every project, and the
 * order and the free figure are {@link CandidateMatch}'s.
 */
@Service
@RequiredArgsConstructor
public class CandidateSearchService {

    static final int MAX_SKILLS = 5;
    static final int MIN_LEVEL = 1;
    static final int MAX_LEVEL = 5;
    static final int MAX_PAGE_SIZE = 100;

    private final AllocationCalculator calculator = new AllocationCalculator();

    private final AccessScopeService accessScopes;
    private final ProjectService projects;
    private final ProjectAllocationRepository allocations;
    private final EmployeeSkillRepository employeeSkills;
    private final LeaveRequestRepository leaveRequests;
    private final EmployeeService employees;
    private final EmployeeListService employeeList;
    private final CatalogService catalogs;
    private final Clock clock;

    @Transactional(readOnly = true)
    public ProjectCandidatesResponse search(CurrentAccount caller, UUID projectId, CandidateQuery query) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.PROJECT_VIEW);
        Project project = projects.find(projectId);
        if (!ProjectService.canEdit(scope, project)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "auth.forbidden", "Access is denied");
        }

        FieldErrors errors = new FieldErrors();
        List<Requirement> required = requirements(query.skills(), errors);
        Sort sort = sort(query.sort(), errors);
        if (query.need() != null && (query.need() < 1 || query.need() > 100)) {
            errors.add("need", "out_of_range");
        }
        if (query.page() < 0) {
            errors.add("page", "out_of_range");
        }
        if (query.size() < 1 || query.size() > MAX_PAGE_SIZE) {
            errors.add("size", "out_of_range");
        }
        LocalDate[] range = range(project, query, errors);
        Map<UUID, CatalogItemRef> skillItems = skillItems(required, errors);
        errors.throwIfAny();
        LocalDate from = range[0];
        LocalDate to = range[1];

        Set<UUID> members = allocations.findByProjectId(project.getId()).stream()
                .filter(a -> !a.getStartDate().isAfter(to) && !a.getEndDate().isBefore(from))
                .map(ProjectAllocation::getEmployeeId).collect(Collectors.toSet());
        Map<UUID, Map<UUID, Integer>> levels = levelsOfSkillHolders(required, members);
        Set<UUID> people = employees.activeIds(levels.keySet());

        List<ProjectAllocation> theirs = people.isEmpty() ? List.of()
                : allocations.findByEmployeeIdInAndStartDateLessThanEqualAndEndDateGreaterThanEqual(people, to, from);
        Map<UUID, EmployeeLoad> loads = theirs.isEmpty() ? Map.of()
                : calculator.loads(theirs.stream().map(CandidateSearchService::planned).toList(), from, to);
        Map<UUID, EmployeeOption> directory = employeeList.options(people);

        Map<UUID, Match> matches = new LinkedHashMap<>();
        Map<UUID, Ranking> rankings = new HashMap<>();
        for (UUID id : people) {
            Match match = CandidateMatch.match(required, levels.get(id));
            if (match.matched() == 0) {
                continue;
            }
            int free = CandidateMatch.freePercent(loads.containsKey(id) ? loads.get(id).peak() : 0);
            matches.put(id, match);
            rankings.put(id, new Ranking(match.matched(), free, directory.get(id).fullName()));
        }
        Comparator<Ranking> order = CandidateMatch.order(sort);
        List<UUID> ranked = matches.keySet().stream()
                .sorted(Comparator.comparing(rankings::get, order).thenComparing(id -> directory.get(id).code()))
                .toList();

        int start = (int) Math.min((long) query.page() * query.size(), ranked.size());
        List<UUID> shown = ranked.subList(start, Math.min(start + query.size(), ranked.size()));
        Map<UUID, List<CandidateLeave>> leave = approvedLeave(Set.copyOf(shown), from, to);
        List<ProjectCandidate> items = shown.stream().map(id -> {
            EmployeeLoad load = loads.getOrDefault(id, new EmployeeLoad(id, List.of()));
            int peak = load.peak();
            Match match = matches.get(id);
            return new ProjectCandidate(person(directory.get(id)), match.matched(), match.required(),
                    match.skills().stream().map(s -> new CandidateSkill(s.skillId(), skillItems.get(s.skillId()).name(),
                            s.level(), s.minLevel(), s.met())).toList(),
                    peak, CandidateMatch.freePercent(peak), CandidateMatch.overloaded(peak), months(load, from, to),
                    leave.getOrDefault(id, List.of()));
        }).toList();
        return new ProjectCandidatesResponse(ranked.size(), members.size(), query.page(), query.size(), items);
    }

    // --- the query ---

    /** {@code <skillId>:<minLevel>} pairs: one to five skills, each once, levels 1 to 5. */
    private static List<Requirement> requirements(String raw, FieldErrors errors) {
        if (raw == null || raw.isBlank()) {
            errors.add("skills", "required");
            return List.of();
        }
        List<Requirement> required = new ArrayList<>();
        Set<UUID> seen = new HashSet<>();
        for (String part : raw.split(",")) {
            String[] pair = part.trim().split(":");
            try {
                if (pair.length != 2) {
                    throw new IllegalArgumentException();
                }
                UUID skillId = UUID.fromString(pair[0].trim());
                int level = Integer.parseInt(pair[1].trim());
                if (level < MIN_LEVEL || level > MAX_LEVEL) {
                    errors.add("skills", "level_out_of_range");
                } else if (!seen.add(skillId)) {
                    errors.add("skills", "duplicate");
                } else {
                    required.add(new Requirement(skillId, level));
                }
            } catch (IllegalArgumentException e) {
                errors.add("skills", "invalid");
            }
        }
        if (required.size() > MAX_SKILLS) {
            errors.add("skills", "too_many");
        }
        return required;
    }

    private static Sort sort(String raw, FieldErrors errors) {
        if (raw == null || raw.isBlank()) {
            return Sort.MATCH;
        }
        return switch (raw.toLowerCase(Locale.ROOT)) {
            case "match" -> Sort.MATCH;
            case "free" -> Sort.FREE;
            default -> {
                errors.add("sort", "invalid");
                yield Sort.MATCH;
            }
        };
    }

    /**
     * The days to look at, within the project: by default from today, or the project's first day when that is
     * later, to its last day.
     */
    private LocalDate[] range(Project project, CandidateQuery query, FieldErrors errors) {
        LocalDate today = LocalDate.ofInstant(clock.instant(), AllocationService.COMPANY_ZONE);
        LocalDate from = query.from() != null ? query.from()
                : (today.isAfter(project.getStartDate()) ? today : project.getStartDate());
        LocalDate to = query.to() != null ? query.to() : project.getEndDate();
        if (from.isBefore(project.getStartDate()) || from.isAfter(project.getEndDate())) {
            errors.add("from", "outside_project");
        }
        if (to.isBefore(project.getStartDate()) || to.isAfter(project.getEndDate())) {
            errors.add("to", "outside_project");
        } else if (to.isBefore(from)) {
            errors.add("to", "before_start");
        }
        return new LocalDate[] {from, to};
    }

    /** The catalog skills asked for; one that does not exist is a field error. */
    private Map<UUID, CatalogItemRef> skillItems(List<Requirement> required, FieldErrors errors) {
        Map<UUID, CatalogItemRef> items = catalogs.findItems(Catalog.SKILL,
                required.stream().map(Requirement::skillId).collect(Collectors.toSet()));
        if (required.stream().anyMatch(r -> !items.containsKey(r.skillId()))) {
            errors.add("skills", "unknown_skill");
        }
        return items;
    }

    // --- the data ---

    /**
     * Each Employee's levels in the required skills, for those who meet at least one of them and are not members.
     * Others are not worth loading.
     */
    private Map<UUID, Map<UUID, Integer>> levelsOfSkillHolders(List<Requirement> required, Set<UUID> members) {
        Map<UUID, Integer> minimum = required.stream()
                .collect(Collectors.toMap(Requirement::skillId, Requirement::minLevel));
        Map<UUID, Map<UUID, Integer>> levels = new LinkedHashMap<>();
        for (EmployeeSkill skill : employeeSkills.findBySkillIdIn(minimum.keySet())) {
            if (!members.contains(skill.getEmployeeId())) {
                levels.computeIfAbsent(skill.getEmployeeId(), id -> new HashMap<>())
                        .put(skill.getSkillId(), skill.getLevel());
            }
        }
        levels.values().removeIf(own -> own.entrySet().stream()
                .noneMatch(e -> e.getValue() >= minimum.get(e.getKey())));
        return levels;
    }

    /** Approved leave of these people within the range, cut to it. */
    private Map<UUID, List<CandidateLeave>> approvedLeave(Set<UUID> people, LocalDate from, LocalDate to) {
        if (people.isEmpty()) {
            return Map.of();
        }
        Map<UUID, List<CandidateLeave>> leave = new HashMap<>();
        for (LeaveRequest request : leaveRequests.findTouching(List.of(LeaveRequestStatus.APPROVED), from, to)) {
            if (people.contains(request.getEmployeeId())) {
                leave.computeIfAbsent(request.getEmployeeId(), id -> new ArrayList<>()).add(new CandidateLeave(
                        request.getStartDate().isBefore(from) ? from : request.getStartDate(),
                        request.getEndDate().isAfter(to) ? to : request.getEndDate()));
            }
        }
        return leave;
    }

    private List<CandidateMonth> months(EmployeeLoad load, LocalDate from, LocalDate to) {
        return calculator.buckets(load, Granularity.MONTH, from, to).stream()
                .map(b -> new CandidateMonth(YearMonth.from(b.from()).toString(), b.peakPercent())).toList();
    }

    private static CandidatePerson person(EmployeeOption option) {
        return new CandidatePerson(option.id(), option.code(), option.fullName(), option.orgUnitName(),
                option.positionName());
    }

    private static PlannedAllocation planned(ProjectAllocation a) {
        return new PlannedAllocation(a.getId(), a.getEmployeeId(), a.getProjectId(), a.getPercent(), a.getStartDate(),
                a.getEndDate());
    }
}
