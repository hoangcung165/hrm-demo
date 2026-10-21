package com.hrmdemo.service.shift;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.shift.DefaultShiftRequest;
import com.hrmdemo.dto.shift.DefaultShiftResponse;
import com.hrmdemo.dto.shift.ShiftAssignRequest;
import com.hrmdemo.dto.shift.ShiftAssignResult;
import com.hrmdemo.dto.shift.ShiftClearRequest;
import com.hrmdemo.dto.shift.ShiftClearResult;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.shift.Shift;
import com.hrmdemo.entity.shift.ShiftAssignment;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.repository.shift.ShiftAssignmentRepository;
import com.hrmdemo.repository.shift.ShiftRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import com.hrmdemo.service.workschedule.WorkScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Phân ca: who works which Ca làm việc on which day, and the Ca mặc định of an Đơn vị tổ chức. All of it needs
 * SHIFT_ASSIGN and works within the caller's data scope: people outside it are refused, never skipped silently.
 * Assigning again replaces; the unique key (Employee, day) keeps a second shift from ever existing, also when two
 * calls run at once, because the rows are written with one upsert.
 */
@Service
@RequiredArgsConstructor
public class ShiftAssignmentService {

    static final int MAX_DAYS = 62;
    static final int MAX_PEOPLE = 500;

    private static final String UPSERT = """
            insert into shift_assignment (id, legal_entity_id, employee_id, work_date, shift_id, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?)
            on conflict (employee_id, work_date) do update
              set shift_id = excluded.shift_id, updated_at = excluded.updated_at""";

    private final ShiftRepository shifts;
    private final ShiftAssignmentRepository assignments;
    private final OrgUnitRepository orgUnits;
    private final OrgUnitService orgUnitService;
    private final EmployeeService employees;
    private final CatalogService catalogs;
    private final WorkScheduleService workSchedule;
    private final AccessScopeService accessScopes;
    private final AuditRecorder audit;
    private final CurrentLegalEntity legalEntity;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    @Transactional
    public ShiftAssignResult assign(CurrentAccount caller, ShiftAssignRequest request) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.SHIFT_ASSIGN);
        List<Map<String, String>> errors = new ArrayList<>();
        if (request == null) {
            errors.add(error("shiftId", "required"));
            throw invalid(errors);
        }
        if (request.shiftId() == null) {
            errors.add(error("shiftId", "required"));
        }
        checkRange(request.from(), request.to(), errors);
        Set<LocalDate> explicit = new LinkedHashSet<>(
                request.includeDays() == null ? List.of() : request.includeDays());
        for (LocalDate day : explicit) {
            if (day == null || (request.from() != null && day.isBefore(request.from()))
                    || (request.to() != null && day.isAfter(request.to()))) {
                errors.add(error("includeDays", "outside_range"));
                break;
            }
        }
        checkTarget(request.employeeIds(), request.orgUnitId(), errors);
        throwIfAny(errors);

        Shift shift = shifts.findById(request.shiftId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                "shift.not_found", "No such shift"));
        if (!shift.isActive()) {
            throw new ApiException(HttpStatus.CONFLICT, "shift.inactive", "The shift is turned off");
        }
        Target target = resolve(scope, request.employeeIds(), request.orgUnitId());

        Set<DayOfWeek> weekdays = request.weekdays() == null || request.weekdays().isEmpty() ? null
                : EnumSet.copyOf(request.weekdays());
        ShiftDaySelection.Result selection = ShiftDaySelection.of(request.from(), request.to(), weekdays,
                workSchedule.current(), catalogs.holidayDays(request.from(), request.to()), explicit);

        Map<String, ShiftAssignment> existing = new HashMap<>();
        if (!selection.days().isEmpty()) {
            for (ShiftAssignment row : assignments.findByEmployeeIdInAndWorkDateBetween(target.employeeIds(),
                    selection.days().get(0), selection.days().get(selection.days().size() - 1))) {
                existing.put(key(row.getEmployeeId(), row.getWorkDate()), row);
            }
        }
        Instant now = clock.instant();
        UUID legalEntityId = legalEntity.id();
        List<Object[]> writes = new ArrayList<>();
        int created = 0;
        int replaced = 0;
        int unchanged = 0;
        for (UUID employee : target.employeeIds()) {
            for (LocalDate day : selection.days()) {
                ShiftAssignment row = existing.get(key(employee, day));
                if (row == null) {
                    created++;
                } else if (row.getShiftId().equals(shift.getId())) {
                    unchanged++;
                    continue;
                } else {
                    replaced++;
                }
                writes.add(new Object[] {UUID.randomUUID(), legalEntityId, employee, java.sql.Date.valueOf(day),
                        shift.getId(), Timestamp.from(now), Timestamp.from(now)});
            }
        }
        if (!writes.isEmpty()) {
            jdbc.batchUpdate(UPSERT, writes);
        }
        List<ShiftAssignResult.SkippedDay> skipped = selection.skipped().stream()
                .map(day -> new ShiftAssignResult.SkippedDay(day.date(), day.reason().name(), day.name())).toList();
        if (created + replaced > 0) {
            Map<String, Object> after = callValues(target, request.from(), request.to());
            after.put("shiftCode", shift.getCode());
            after.put("days", selection.days().size());
            after.put("created", created);
            after.put("replaced", replaced);
            audit.record(caller, AuditRegistrations.SHIFT_ASSIGNMENT, UUID.randomUUID(), AuditAction.CREATE,
                    "Shift " + shift.getCode() + " assigned to " + target.employeeIds().size() + " people, "
                            + created + " added and " + replaced + " replaced", null, after);
        }
        return new ShiftAssignResult(target.employeeIds().size(), selection.days(), created, replaced, unchanged,
                skipped);
    }

    @Transactional
    public ShiftClearResult clear(CurrentAccount caller, ShiftClearRequest request) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.SHIFT_ASSIGN);
        List<Map<String, String>> errors = new ArrayList<>();
        if (request == null) {
            errors.add(error("from", "required"));
            throw invalid(errors);
        }
        checkRange(request.from(), request.to(), errors);
        checkTarget(request.employeeIds(), request.orgUnitId(), errors);
        throwIfAny(errors);
        Target target = resolve(scope, request.employeeIds(), request.orgUnitId());

        int removed = assignments.deleteByEmployeesBetween(target.employeeIds(), request.from(), request.to());
        if (removed > 0) {
            Map<String, Object> before = callValues(target, request.from(), request.to());
            before.put("removed", removed);
            audit.record(caller, AuditRegistrations.SHIFT_ASSIGNMENT, UUID.randomUUID(), AuditAction.DELETE,
                    removed + " shift assignments of " + target.employeeIds().size() + " people cleared", before,
                    null);
        }
        return new ShiftClearResult(target.employeeIds().size(), removed);
    }

    @Transactional
    public DefaultShiftResponse setDefault(CurrentAccount caller, UUID orgUnitId, DefaultShiftRequest request) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.SHIFT_ASSIGN);
        OrgUnit unit = orgUnits.findById(orgUnitId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                "org_unit.not_found", "No such organization unit"));
        scope.requireOrgUnit(unit.getId());
        Shift shift = null;
        if (request != null && request.shiftId() != null) {
            shift = shifts.findById(request.shiftId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                    "shift.not_found", "No such shift"));
            if (!shift.isActive()) {
                throw new ApiException(HttpStatus.CONFLICT, "shift.inactive", "The shift is turned off");
            }
        }
        UUID previous = unit.getDefaultShiftId();
        UUID next = shift == null ? null : shift.getId();
        if (java.util.Objects.equals(previous, next)) {
            return new DefaultShiftResponse(unit.getId(), next);
        }
        Map<String, Object> before = new LinkedHashMap<>();
        before.put("orgUnit", unit.getName());
        before.put("defaultShiftCode", previous == null ? null
                : shifts.findById(previous).map(Shift::getCode).orElse(null));
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("orgUnit", unit.getName());
        after.put("defaultShiftCode", shift == null ? null : shift.getCode());
        unit.setDefaultShift(next, clock.instant());
        audit.record(caller, AuditRegistrations.SHIFT_ASSIGNMENT, unit.getId(), AuditAction.UPDATE,
                "Default shift of " + unit.getCode() + (shift == null ? " cleared" : " set to " + shift.getCode()),
                before, after);
        return new DefaultShiftResponse(unit.getId(), next);
    }

    /** The people a call covers and the unit it named, if any. */
    private record Target(List<UUID> employeeIds, OrgUnit unit) {
    }

    private Target resolve(AccessScope scope, List<UUID> employeeIds, UUID orgUnitId) {
        if (orgUnitId != null) {
            Set<UUID> units = orgUnitService.selfAndDescendants(orgUnitId);
            if (units.isEmpty()) {
                throw new ApiException(HttpStatus.NOT_FOUND, "org_unit.not_found", "No such organization unit");
            }
            Map<UUID, UUID> members = employees.activeInOrgUnits(units);
            refuseOutOfScope(scope, members);
            if (members.size() > MAX_PEOPLE) {
                throw invalid(List.of(error("orgUnitId", "too_many_people")));
            }
            return new Target(sorted(members.keySet()), orgUnits.findById(orgUnitId).orElse(null));
        }
        List<UUID> ids = new ArrayList<>(new LinkedHashSet<>(employeeIds));
        if (ids.size() > MAX_PEOPLE) {
            throw invalid(List.of(error("employeeIds", "too_many_people")));
        }
        var facts = employees.workFacts(ids);
        Map<UUID, UUID> members = new LinkedHashMap<>();
        for (UUID id : ids) {
            var fact = facts.get(id);
            if (fact == null || !fact.active()) {
                throw invalid(List.of(error("employeeIds", fact == null ? "not_found" : "inactive")));
            }
            members.put(id, fact.orgUnitId());
        }
        refuseOutOfScope(scope, members);
        return new Target(sorted(ids), null);
    }

    /**
     * The people in one fixed order. Two calls that write the same rows then take their row locks in the same order,
     * so they wait for each other instead of deadlocking.
     */
    private static List<UUID> sorted(java.util.Collection<UUID> ids) {
        return ids.stream().sorted().toList();
    }

    private static void refuseOutOfScope(AccessScope scope, Map<UUID, UUID> unitOf) {
        long outside = unitOf.entrySet().stream()
                .filter(member -> !scope.coversEmployee(member.getKey(), member.getValue())).count();
        if (outside > 0) {
            throw new ApiException(HttpStatus.FORBIDDEN, "shift_assignment.out_of_scope",
                    "Some people are outside your data scope").with("count", outside);
        }
    }

    private static Map<String, Object> callValues(Target target, LocalDate from, LocalDate to) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("orgUnit", target.unit() == null ? null : target.unit().getName());
        values.put("employees", target.employeeIds().size());
        values.put("fromDate", from.toString());
        values.put("toDate", to.toString());
        return values;
    }

    private static void checkTarget(List<UUID> employeeIds, UUID orgUnitId, List<Map<String, String>> errors) {
        boolean people = employeeIds != null && !employeeIds.isEmpty();
        if (people && orgUnitId != null) {
            errors.add(error("orgUnitId", "exclusive"));
        } else if (!people && orgUnitId == null) {
            errors.add(error("employeeIds", "required"));
        } else if (people && employeeIds.stream().anyMatch(java.util.Objects::isNull)) {
            errors.add(error("employeeIds", "invalid"));
        }
    }

    private static void checkRange(LocalDate from, LocalDate to, List<Map<String, String>> errors) {
        if (from == null) {
            errors.add(error("from", "required"));
        }
        if (to == null) {
            errors.add(error("to", "required"));
        }
        if (from != null && to != null) {
            if (to.isBefore(from)) {
                errors.add(error("to", "before_from"));
            } else if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_DAYS) {
                errors.add(error("to", "range_too_long"));
            }
        }
    }

    private static String key(UUID employee, LocalDate day) {
        return employee + "@" + day;
    }

    private static Map<String, String> error(String field, String code) {
        return Map.of("field", field, "code", code);
    }

    private static void throwIfAny(List<Map<String, String>> errors) {
        if (!errors.isEmpty()) {
            throw invalid(errors);
        }
    }

    private static ApiException invalid(List<Map<String, String>> errors) {
        return new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request values are invalid")
                .with("errors", errors);
    }
}
