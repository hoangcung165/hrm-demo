package com.hrmdemo.service.attendance;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.attendance.ManualAttendanceClearRequest;
import com.hrmdemo.dto.attendance.ManualAttendanceClearResult;
import com.hrmdemo.dto.attendance.ManualAttendanceRequest;
import com.hrmdemo.dto.attendance.ManualAttendanceResponse;
import com.hrmdemo.dto.attendance.ManualAttendanceSaveResult;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.entity.attendance.ManualAttendance;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.shift.Shift;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.attendance.ManualAttendanceRepository;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.repository.shift.ShiftRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.attendance.AttendanceProcessor.ManualDay;
import com.hrmdemo.service.attendance.AttendanceProcessor.ManualKind;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Công thủ công (HRM-24): the timekeeper enters the result of a day (Đủ công, Nửa công, Vắng, or In and Out times) for
 * people who have no machine to punch on. Everything needs ATTENDANCE_MANUAL and works within the caller's data scope:
 * people outside it are refused, never skipped silently. Only days with a Ca làm việc take an entry; days in the future
 * take none. Saving again replaces; the unique key (Employee, day) and a single upsert keep a second entry from ever
 * existing. Every save and clear leaves one Audit log record.
 */
@Service
@RequiredArgsConstructor
public class ManualAttendanceService {

    static final int MAX_DAYS = 62;
    static final int MAX_PEOPLE = 500;
    static final int MAX_NOTE = 500;

    private static final String UPSERT = """
            insert into manual_attendance (id, legal_entity_id, employee_id, work_date, kind, minute_in, minute_out, note,
                                           entered_by, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict (employee_id, work_date) do update
              set kind = excluded.kind, minute_in = excluded.minute_in, minute_out = excluded.minute_out,
                  note = excluded.note, entered_by = excluded.entered_by, updated_at = excluded.updated_at""";

    private final ManualAttendanceRepository entries;
    private final ShiftRepository shifts;
    private final ShiftDays shiftDays;
    private final OrgUnitRepository orgUnits;
    private final OrgUnitService orgUnitService;
    private final EmployeeService employees;
    private final AccountRepository accounts;
    private final AccessScopeService accessScopes;
    private final AuditRecorder audit;
    private final CurrentLegalEntity legalEntity;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    /** The entries and the shift days of the people of a unit (or the people given) for a range. */
    @Transactional(readOnly = true)
    public ManualAttendanceResponse list(CurrentAccount caller, List<UUID> employeeIds, UUID orgUnitId, LocalDate from,
            LocalDate to) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.ATTENDANCE_MANUAL);
        List<Map<String, String>> errors = new ArrayList<>();
        checkRange(from, to, errors);
        checkTarget(employeeIds, orgUnitId, errors);
        throwIfAny(errors);
        Target target = resolve(scope, employeeIds, orgUnitId);

        Map<UUID, Map<LocalDate, UUID>> shiftsOf = shiftDays.of(target.unitOf(), from, to);
        Map<UUID, List<ManualAttendance>> rowsOf = new HashMap<>();
        if (!target.unitOf().isEmpty()) {
            entries.findByEmployeeIdInAndWorkDateBetween(target.unitOf().keySet(), from, to)
                    .forEach(row -> rowsOf.computeIfAbsent(row.getEmployeeId(), id -> new ArrayList<>()).add(row));
        }
        Map<UUID, String> names = new HashMap<>();
        accounts.findAllById(rowsOf.values().stream().flatMap(List::stream).map(ManualAttendance::getEnteredBy)
                .collect(Collectors.toSet())).forEach(account -> names.put(account.getId(), account.getFullName()));
        Map<UUID, EmployeeCard> cards = employees.cards(List.copyOf(target.unitOf().keySet()));
        ZoneId zone = PunchImportService.COMPANY_ZONE;
        List<ManualAttendanceResponse.Row> rows = target.unitOf().keySet().stream()
                .sorted(Comparator.comparing((UUID id) -> cards.get(id).fullName()).thenComparing(id -> id))
                .map(id -> new ManualAttendanceResponse.Row(cards.get(id), target.unitOf().get(id),
                        List.copyOf(shiftsOf.getOrDefault(id, Map.of()).keySet()),
                        rowsOf.getOrDefault(id, List.of()).stream()
                                .sorted(Comparator.comparing(ManualAttendance::getWorkDate))
                                .map(row -> new ManualAttendanceResponse.Entry(row.getWorkDate(), row.getKind(),
                                        row.getTimeIn(), row.getTimeOut(), row.getNote(),
                                        names.get(row.getEnteredBy()),
                                        row.getUpdatedAt().atZone(zone).toOffsetDateTime()))
                                .toList()))
                .toList();
        return new ManualAttendanceResponse(from, to, rows);
    }

    @Transactional
    public ManualAttendanceSaveResult save(CurrentAccount caller, ManualAttendanceRequest request) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.ATTENDANCE_MANUAL);
        List<Map<String, String>> errors = new ArrayList<>();
        if (request == null) {
            throw invalid(List.of(error("kind", "required")));
        }
        ManualKind kind = parseKind(request.kind(), errors);
        if (kind == ManualKind.TIMES) {
            if (request.in() == null) {
                errors.add(error("in", "required"));
            }
            if (request.out() == null) {
                errors.add(error("out", "required"));
            }
            if (request.in() != null && request.in().equals(request.out())) {
                errors.add(error("out", "same_as_in"));
            }
        } else if (kind != null && (request.in() != null || request.out() != null)) {
            errors.add(error(request.in() != null ? "in" : "out", "times_for_times_only"));
        }
        String note = request.note() == null || request.note().isBlank() ? null : request.note().trim();
        if (note != null && note.length() > MAX_NOTE) {
            errors.add(error("note", "too_long"));
        }
        checkRange(request.from(), request.to(), errors);
        checkTarget(request.employeeIds(), request.orgUnitId(), errors);
        Set<LocalDate> chosen = chosenDays(request.from(), request.to(), request.days(), errors);
        throwIfAny(errors);
        Target target = resolve(scope, request.employeeIds(), request.orgUnitId());

        Map<UUID, Map<LocalDate, UUID>> shiftsOf = shiftDays.of(target.unitOf(), request.from(), request.to());
        boolean overnight = kind == ManualKind.TIMES && !request.out().isAfter(request.in());
        if (overnight) {
            Set<UUID> used = shiftsOf.values().stream().flatMap(days -> days.entrySet().stream()
                    .filter(day -> chosen.contains(day.getKey())).map(Map.Entry::getValue))
                    .collect(Collectors.toSet());
            boolean dayShift = shifts.findAllById(used).stream()
                    .anyMatch(shift -> shift.getEndTime().isAfter(shift.getStartTime()));
            if (dayShift) {
                throw invalid(List.of(error("out", "before_in")));
            }
        }

        Map<String, ManualAttendance> existing = new HashMap<>();
        if (!target.unitOf().isEmpty()) {
            for (ManualAttendance row : entries.findByEmployeeIdInAndWorkDateBetween(target.unitOf().keySet(),
                    request.from(), request.to())) {
                existing.put(key(row.getEmployeeId(), row.getWorkDate()), row);
            }
        }
        Instant now = clock.instant();
        UUID legalEntityId = legalEntity.id();
        UUID enteredBy = caller.id();
        List<Object[]> writes = new ArrayList<>();
        Map<LocalDate, Integer> skipped = new TreeMap<>();
        Set<LocalDate> savedDays = new HashSet<>();
        int created = 0;
        int replaced = 0;
        int unchanged = 0;
        for (UUID employee : target.ordered()) {
            Map<LocalDate, UUID> own = shiftsOf.getOrDefault(employee, Map.of());
            for (LocalDate day : chosen) {
                if (!own.containsKey(day)) {
                    skipped.merge(day, 1, Integer::sum);
                    continue;
                }
                ManualAttendance row = existing.get(key(employee, day));
                if (row == null) {
                    created++;
                } else if (row.getKind().equals(kind.name()) && Objects.equals(row.getTimeIn(), request.in())
                        && Objects.equals(row.getTimeOut(), request.out()) && Objects.equals(row.getNote(), note)) {
                    unchanged++;
                    continue;
                } else {
                    replaced++;
                }
                savedDays.add(day);
                writes.add(new Object[] {UUID.randomUUID(), legalEntityId, employee, java.sql.Date.valueOf(day),
                        kind.name(), minutes(request.in()), minutes(request.out()), note, enteredBy, Timestamp.from(now),
                        Timestamp.from(now)});
            }
        }
        if (!writes.isEmpty()) {
            jdbc.batchUpdate(UPSERT, writes);
            Map<String, Object> after = callValues(target, request.from(), request.to());
            after.put("kind", kind.name());
            after.put("timeIn", request.in() == null ? null : request.in().toString());
            after.put("timeOut", request.out() == null ? null : request.out().toString());
            after.put("note", note);
            after.put("days", savedDays.size());
            after.put("created", created);
            after.put("replaced", replaced);
            audit.record(caller, AuditRegistrations.MANUAL_ATTENDANCE, UUID.randomUUID(), AuditAction.CREATE,
                    "Manual attendance " + kind.name() + " entered for " + target.ordered().size() + " people, "
                            + created + " added and " + replaced + " replaced", null, after);
        }
        List<ManualAttendanceSaveResult.SkippedDay> skippedDays = skipped.entrySet().stream()
                .map(day -> new ManualAttendanceSaveResult.SkippedDay(day.getKey(), "NO_SHIFT", day.getValue()))
                .toList();
        return new ManualAttendanceSaveResult(target.ordered().size(), created, replaced, unchanged, skippedDays);
    }

    @Transactional
    public ManualAttendanceClearResult clear(CurrentAccount caller, ManualAttendanceClearRequest request) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.ATTENDANCE_MANUAL);
        List<Map<String, String>> errors = new ArrayList<>();
        if (request == null) {
            throw invalid(List.of(error("from", "required")));
        }
        checkRange(request.from(), request.to(), errors);
        checkTarget(request.employeeIds(), request.orgUnitId(), errors);
        Set<LocalDate> chosen = chosenDays(request.from(), request.to(), request.days(), errors);
        throwIfAny(errors);
        Target target = resolve(scope, request.employeeIds(), request.orgUnitId());

        int removed = target.ordered().isEmpty() ? 0 : entries.deleteByEmployeesOnDays(target.ordered(), chosen);
        if (removed > 0) {
            Map<String, Object> before = callValues(target, request.from(), request.to());
            before.put("removed", removed);
            audit.record(caller, AuditRegistrations.MANUAL_ATTENDANCE, UUID.randomUUID(), AuditAction.DELETE,
                    removed + " manual attendance entries of " + target.ordered().size() + " people cleared", before,
                    null);
        }
        return new ManualAttendanceClearResult(target.ordered().size(), removed);
    }

    /**
     * The entry as the Bộ xử lý chấm công reads it: In and Out of a TIMES entry on the day, an Out at or before the In
     * on the next calendar day.
     */
    static ManualDay toManualDay(ManualAttendance row, ZoneId zone) {
        ManualKind kind = ManualKind.valueOf(row.getKind());
        if (kind != ManualKind.TIMES) {
            return ManualDay.of(kind);
        }
        LocalDate outDay = row.getTimeOut().isAfter(row.getTimeIn()) ? row.getWorkDate()
                : row.getWorkDate().plusDays(1);
        return ManualDay.times(row.getWorkDate().atTime(row.getTimeIn()).atZone(zone).toInstant(),
                outDay.atTime(row.getTimeOut()).atZone(zone).toInstant());
    }

    /** The people a call covers in one fixed order, with their units, and the unit it named, if any. */
    private record Target(List<UUID> ordered, Map<UUID, UUID> unitOf, OrgUnit unit) {
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
            return new Target(sorted(members.keySet()), members, orgUnits.findById(orgUnitId).orElse(null));
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
        return new Target(sorted(ids), members, null);
    }

    /** One fixed order, so two calls writing the same rows take their row locks alike and do not deadlock. */
    private static List<UUID> sorted(Collection<UUID> ids) {
        return ids.stream().sorted().toList();
    }

    private static void refuseOutOfScope(AccessScope scope, Map<UUID, UUID> unitOf) {
        long outside = unitOf.entrySet().stream()
                .filter(member -> !scope.coversEmployee(member.getKey(), member.getValue())).count();
        if (outside > 0) {
            throw new ApiException(HttpStatus.FORBIDDEN, "manual_attendance.out_of_scope",
                    "Some people are outside your data scope").with("count", outside);
        }
    }

    private static ManualKind parseKind(String kind, List<Map<String, String>> errors) {
        if (kind == null || kind.isBlank()) {
            errors.add(error("kind", "required"));
            return null;
        }
        try {
            return ManualKind.valueOf(kind);
        } catch (IllegalArgumentException e) {
            errors.add(error("kind", "invalid"));
            return null;
        }
    }

    /** The days of the range the call is about: every day, or the listed ones (which must lie in the range). */
    private static Set<LocalDate> chosenDays(LocalDate from, LocalDate to, List<LocalDate> days,
            List<Map<String, String>> errors) {
        Set<LocalDate> chosen = new java.util.TreeSet<>();
        if (from == null || to == null || to.isBefore(from)) {
            return chosen;
        }
        if (days == null || days.isEmpty()) {
            for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
                chosen.add(day);
            }
            return chosen;
        }
        for (LocalDate day : days) {
            if (day == null || day.isBefore(from) || day.isAfter(to)) {
                errors.add(error("days", "outside_range"));
                return chosen;
            }
            chosen.add(day);
        }
        return chosen;
    }

    private void checkRange(LocalDate from, LocalDate to, List<Map<String, String>> errors) {
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
            } else if (to.isAfter(clock.instant().atZone(PunchImportService.COMPANY_ZONE).toLocalDate())) {
                errors.add(error("to", "future"));
            }
        }
    }

    private static void checkTarget(List<UUID> employeeIds, UUID orgUnitId, List<Map<String, String>> errors) {
        boolean people = employeeIds != null && !employeeIds.isEmpty();
        if (people && orgUnitId != null) {
            errors.add(error("orgUnitId", "exclusive"));
        } else if (!people && orgUnitId == null) {
            errors.add(error("employeeIds", "required"));
        } else if (people && employeeIds.stream().anyMatch(Objects::isNull)) {
            errors.add(error("employeeIds", "invalid"));
        }
    }

    private static Map<String, Object> callValues(Target target, LocalDate from, LocalDate to) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("orgUnit", target.unit() == null ? null : target.unit().getName());
        values.put("employees", target.ordered().size());
        values.put("fromDate", from.toString());
        values.put("toDate", to.toString());
        return values;
    }

    private static Integer minutes(LocalTime value) {
        return value == null ? null : value.getHour() * 60 + value.getMinute();
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
