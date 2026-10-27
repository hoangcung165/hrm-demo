package com.hrmdemo.service.leave;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.dto.employee.EmployeeWorkFacts;
import com.hrmdemo.dto.leave.DayPart;
import com.hrmdemo.dto.leave.LeaveCalendarDay;
import com.hrmdemo.dto.leave.LeaveCalendarEntry;
import com.hrmdemo.dto.leave.LeaveCalendarHoliday;
import com.hrmdemo.dto.leave.LeaveCalendarResponse;
import com.hrmdemo.dto.leave.LeaveOnDay;
import com.hrmdemo.dto.leave.LeaveRequestStatus;
import com.hrmdemo.dto.leave.LeaveTypeRef;
import com.hrmdemo.entity.leave.LeaveRequest;
import com.hrmdemo.entity.project.ProjectAllocation;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.leave.LeaveRequestRepository;
import com.hrmdemo.repository.project.ProjectAllocationRepository;
import com.hrmdemo.repository.project.ProjectRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lịch nghỉ phép (HRM-19): who is off on which days, from the Đơn nghỉ that are approved or waiting (a returned one is
 * back with its sender and plans nothing). Each person's days are the days their request counts, so weekends,
 * holidays and half days are exact. It shows what the caller's data scope covers: everyone with company scope, the
 * units they head, and always themselves. Can be narrowed to a unit (with the units below it) or to a project (people
 * with an allocation on it during the request).
 */
@Service
@RequiredArgsConstructor
public class LeaveCalendarService {

    /** The longest range one call returns: two months. */
    static final int MAX_DAYS = 62;

    private static final Set<LeaveRequestStatus> SHOWN = EnumSet.of(LeaveRequestStatus.PENDING,
            LeaveRequestStatus.APPROVED);

    private final LeaveRequestRepository requests;
    private final LeavePolicyService policies;
    private final EmployeeService employees;
    private final OrgUnitService orgUnits;
    private final ProjectRepository projects;
    private final ProjectAllocationRepository allocations;
    private final CatalogService catalogs;
    private final AccessScopeService accessScopes;

    @Transactional(readOnly = true)
    public LeaveCalendarResponse calendar(CurrentAccount caller, LocalDate from, LocalDate to, UUID orgUnitId,
            UUID projectId) {
        checkRange(from, to);
        AccessScope scope = accessScopes.scopeOf(caller);
        Set<UUID> units = null;
        if (orgUnitId != null) {
            units = orgUnits.selfAndDescendants(orgUnitId);
            if (units.isEmpty()) {
                throw new ApiException(HttpStatus.NOT_FOUND, "org_unit.not_found", "No such organization unit");
            }
        }
        List<ProjectAllocation> onProject = List.of();
        if (projectId != null) {
            if (!projects.existsById(projectId)) {
                throw new ApiException(HttpStatus.NOT_FOUND, "project.not_found", "Project not found");
            }
            onProject = allocations.findByProjectId(projectId);
        }

        List<LeaveRequest> touching = requests.findTouching(SHOWN, from, to);
        Map<UUID, EmployeeWorkFacts> facts = employees.workFacts(
                touching.stream().map(LeaveRequest::getEmployeeId).collect(Collectors.toSet()));
        Map<UUID, LeaveTypeRef> types = policies.refs().stream()
                .collect(Collectors.toMap(LeaveTypeRef::id, ref -> ref));

        List<LeaveCalendarEntry> entries = new ArrayList<>();
        for (LeaveRequest request : touching) {
            EmployeeWorkFacts who = facts.get(request.getEmployeeId());
            if (who == null || !scope.coversEmployee(request.getEmployeeId(), who.orgUnitId())) {
                continue;
            }
            if (units != null && (who.orgUnitId() == null || !units.contains(who.orgUnitId()))) {
                continue;
            }
            List<LeaveCalendarDay> days = request.getDayList().stream()
                    .filter(day -> day.getValue().signum() > 0 && !day.getDay().isBefore(from)
                            && !day.getDay().isAfter(to))
                    .map(day -> new LeaveCalendarDay(day.getDay(), day.isMorning(), day.isAfternoon()))
                    .sorted(Comparator.comparing(LeaveCalendarDay::date))
                    .toList();
            if (days.isEmpty() || (projectId != null && !onProjectDuring(onProject, request))) {
                continue;
            }
            entries.add(new LeaveCalendarEntry(request.getId(), who.card(), types.get(request.getLeaveTypeId()),
                    request.getStatus(), days));
        }
        entries.sort(Comparator.<LeaveCalendarEntry, LocalDate>comparing(entry -> entry.days().get(0).date())
                .thenComparing(entry -> entry.employee().fullName()));

        List<LeaveCalendarHoliday> holidays = catalogs.holidayDays(from, to).entrySet().stream()
                .map(holiday -> new LeaveCalendarHoliday(holiday.getKey(), holiday.getValue()))
                .sorted(Comparator.comparing(LeaveCalendarHoliday::date))
                .toList();
        return new LeaveCalendarResponse(from, to, holidays, entries);
    }

    /**
     * The approved Đơn nghỉ that take {@code day}, for Employees who still work here, within the caller's data scope
     * (the scope of {@link #calendar}), by name. A waiting request plans nothing yet and is left out; a day a request
     * does not count (a weekend, a holiday) is not leave.
     */
    @Transactional(readOnly = true)
    public List<LeaveOnDay> approvedOn(CurrentAccount caller, LocalDate day) {
        AccessScope scope = accessScopes.scopeOf(caller);
        List<LeaveRequest> touching = requests.findTouching(EnumSet.of(LeaveRequestStatus.APPROVED), day, day);
        Map<UUID, EmployeeWorkFacts> facts = employees.workFacts(
                touching.stream().map(LeaveRequest::getEmployeeId).collect(Collectors.toSet()));
        Map<UUID, LeaveTypeRef> types = policies.refs().stream()
                .collect(Collectors.toMap(LeaveTypeRef::id, ref -> ref));

        List<LeaveOnDay> off = new ArrayList<>();
        for (LeaveRequest request : touching) {
            EmployeeWorkFacts who = facts.get(request.getEmployeeId());
            if (who == null || !who.active() || !scope.coversEmployee(request.getEmployeeId(), who.orgUnitId())) {
                continue;
            }
            List<LeaveRequest.Day> counted = request.getDayList().stream().filter(d -> d.getValue().signum() > 0)
                    .toList();
            LeaveRequest.Day thatDay = counted.stream().filter(d -> d.getDay().equals(day)).findFirst().orElse(null);
            if (thatDay == null) {
                continue;
            }
            LocalDate until = counted.stream().map(LeaveRequest.Day::getDay).max(Comparator.naturalOrder())
                    .orElse(day);
            off.add(new LeaveOnDay(request.getId(), who.card(), types.get(request.getLeaveTypeId()), partOf(thatDay),
                    until));
        }
        off.sort(Comparator.comparing((LeaveOnDay entry) -> entry.employee().fullName())
                .thenComparing(entry -> entry.employee().id()));
        return off;
    }

    private static DayPart partOf(LeaveRequest.Day day) {
        if (day.isMorning() && !day.isAfternoon()) {
            return DayPart.MORNING;
        }
        return day.isAfternoon() && !day.isMorning() ? DayPart.AFTERNOON : DayPart.FULL;
    }

    /** Whether the Employee has an allocation on the project that overlaps the request's dates. */
    private static boolean onProjectDuring(List<ProjectAllocation> onProject, LeaveRequest request) {
        return onProject.stream().anyMatch(allocation -> allocation.getEmployeeId().equals(request.getEmployeeId())
                && !allocation.getStartDate().isAfter(request.getEndDate())
                && !allocation.getEndDate().isBefore(request.getStartDate()));
    }

    private static void checkRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw invalid(from == null ? "from" : "to", "required");
        }
        if (to.isBefore(from)) {
            throw invalid("to", "before_from");
        }
        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_DAYS) {
            throw invalid("to", "range_too_long");
        }
    }

    private static ApiException invalid(String field, String code) {
        return new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request value is invalid: " + field)
                .with("errors", List.of(Map.of("field", field, "code", code)));
    }
}
