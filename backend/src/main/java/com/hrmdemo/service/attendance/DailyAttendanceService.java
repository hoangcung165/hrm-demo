package com.hrmdemo.service.attendance;

import java.text.Normalizer;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.attendance.DailyAttendanceResponse;
import com.hrmdemo.dto.attendance.DailyAttendanceResponse.Day;
import com.hrmdemo.dto.attendance.DailyAttendanceResponse.Totals;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.employee.EmployeeMember;
import com.hrmdemo.dto.leave.LeaveRequestStatus;
import com.hrmdemo.dto.shift.ShiftCalendarResponse.ShiftBrief;
import com.hrmdemo.entity.leave.LeaveRequest;
import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.shift.Shift;
import com.hrmdemo.entity.shift.ShiftAssignment;
import com.hrmdemo.entity.shift.ShiftPattern;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.attendance.PunchImportRepository;
import com.hrmdemo.repository.attendance.PunchRepository;
import com.hrmdemo.repository.leave.LeaveRequestRepository;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.repository.shift.ShiftAssignmentRepository;
import com.hrmdemo.repository.shift.ShiftRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.attendance.AttendanceProcessor.DailyRecord;
import com.hrmdemo.service.attendance.AttendanceProcessor.Flag;
import com.hrmdemo.service.attendance.AttendanceProcessor.LeavePart;
import com.hrmdemo.service.attendance.AttendanceProcessor.Result;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import com.hrmdemo.service.shift.EffectiveShifts;
import com.hrmdemo.service.workschedule.WorkScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Công theo ngày (HRM-23): the {@link AttendanceProcessor} run on read for every Employee the caller may see. Nothing is
 * stored (locking a month is HRM-26). With ATTENDANCE_VIEW the caller sees what their data scope covers; without it
 * only their own days. Paged by Employee, a range of at most 62 days.
 *
 * <p>A day the log does not cover is not judged: a day that starts after the latest stored punch of the company, and
 * today until its Khung ca has closed, are {@code noLog} and neither absent nor missing a punch (otherwise everyone is
 * absent until HR imports).
 */
@Service
@RequiredArgsConstructor
public class DailyAttendanceService {

    static final int MAX_DAYS = 62;
    static final int MAX_PAGE_SIZE = 500;
    public static final String SORT_ABNORMAL = "abnormal";
    public static final String SORT_NAME = "name";

    private static final Set<Flag> JUDGED = EnumSet.of(Flag.ABSENT, Flag.MISSING_IN, Flag.MISSING_OUT);

    private final ShiftRepository shifts;
    private final ShiftAssignmentRepository assignments;
    private final OrgUnitRepository orgUnits;
    private final OrgUnitService orgUnitService;
    private final EmployeeService employees;
    private final CatalogService catalogs;
    private final WorkScheduleService workSchedule;
    private final AccessScopeService accessScopes;
    private final PunchRepository punches;
    private final PunchImportRepository imports;
    private final LeaveRequestRepository leaveRequests;
    private final Clock clock;

    /** One Employee's days and totals, before paging. */
    private record Computed(EmployeeMember member, List<Day> days, Totals totals, int abnormalDays) {
    }

    @Transactional(readOnly = true)
    public DailyAttendanceResponse daily(CurrentAccount caller, LocalDate from, LocalDate to, UUID orgUnitId,
            UUID employeeId, String q, boolean abnormalOnly, String sort, int page, int size) {
        checkQuery(from, to, sort, page, size);
        AccessScope scope = accessScopes.scopeOf(caller);
        Set<UUID> units = null;
        if (orgUnitId != null) {
            units = orgUnitService.selfAndDescendants(orgUnitId);
            if (units.isEmpty()) {
                throw new ApiException(HttpStatus.NOT_FOUND, "org_unit.not_found", "No such organization unit");
            }
        }
        List<EmployeeMember> visible = visibleMembers(scope, units, employeeId, q);
        ZoneId zone = PunchImportService.COMPANY_ZONE;
        Instant now = clock.instant();
        Instant coveredUntil = punches.latestPunchedAt();

        LocalDate padFrom = from.minusDays(1);
        Map<LocalDate, String> holidays = catalogs.holidayDays(padFrom, to);
        EffectiveShifts effective = effectiveShifts(holidays);
        Map<UUID, Shift> shiftById = shifts.findAll().stream().collect(Collectors.toMap(Shift::getId, s -> s));
        List<UUID> ids = visible.stream().map(EmployeeMember::id).toList();
        Map<UUID, Map<LocalDate, UUID>> assigned = new HashMap<>();
        Map<UUID, List<Instant>> punchesOf = new HashMap<>();
        Map<UUID, Map<LocalDate, LeavePart>> leaveOf = new HashMap<>();
        if (!ids.isEmpty()) {
            for (ShiftAssignment row : assignments.findByEmployeeIdInAndWorkDateBetween(ids, padFrom, to)) {
                assigned.computeIfAbsent(row.getEmployeeId(), id -> new HashMap<>())
                        .put(row.getWorkDate(), row.getShiftId());
            }
            punches.findByEmployeeIdInAndPunchedAtGreaterThanEqualAndPunchedAtLessThanOrderByPunchedAt(ids,
                    padFrom.atStartOfDay(zone).toInstant(), to.plusDays(2).atStartOfDay(zone).toInstant())
                    .forEach(punch -> punchesOf.computeIfAbsent(punch.getEmployeeId(), id -> new ArrayList<>())
                            .add(punch.getPunchedAt()));
            Set<UUID> idSet = new HashSet<>(ids);
            for (LeaveRequest request : leaveRequests.findTouching(EnumSet.of(LeaveRequestStatus.APPROVED), from, to)) {
                if (idSet.contains(request.getEmployeeId())) {
                    request.getDayList().stream().filter(day -> day.getValue().signum() > 0)
                            .forEach(day -> leaveOf.computeIfAbsent(request.getEmployeeId(), id -> new HashMap<>())
                                    .put(day.getDay(), part(day.isMorning(), day.isAfternoon())));
                }
            }
        }

        AttendanceProcessor processor = new AttendanceProcessor(AttendanceProcessor.Rules.DEFAULT, zone);
        Duration marginAfter = AttendanceProcessor.Rules.DEFAULT.marginAfter();
        List<Computed> computed = new ArrayList<>();
        Set<UUID> usedShifts = new HashSet<>();
        for (EmployeeMember member : visible) {
            Map<LocalDate, UUID> own = assigned.getOrDefault(member.id(), Map.of());
            Map<LocalDate, ShiftPattern> patterns = new TreeMap<>();
            Map<LocalDate, UUID> shiftIds = new HashMap<>();
            for (LocalDate day = padFrom; !day.isAfter(to); day = day.plusDays(1)) {
                var cell = effective.of(member.orgUnitId(), day, own.get(day));
                if (cell.isPresent() && shiftById.containsKey(cell.get().shiftId())) {
                    patterns.put(day, shiftById.get(cell.get().shiftId()).pattern());
                    shiftIds.put(day, cell.get().shiftId());
                }
            }
            Result result = processor.process(punchesOf.getOrDefault(member.id(), List.of()), from, to, patterns,
                    holidays, leaveOf.getOrDefault(member.id(), Map.of()));
            Map<LocalDate, Day> byDate = new TreeMap<>();
            for (DailyRecord record : result.days()) {
                Day day = toDay(record, shiftIds.get(record.date()), coveredUntil, now, marginAfter, zone);
                usedShifts.add(day.shiftId());
                byDate.put(day.date(), day);
            }
            noShiftDays(result.unassigned(), zone).forEach(day -> byDate.putIfAbsent(day.date(), day));
            List<Day> days = new ArrayList<>(byDate.values());
            computed.add(new Computed(member, days, totals(days), (int) days.stream().filter(this::abnormal).count()));
        }

        List<Computed> shown = computed.stream().filter(c -> !abnormalOnly || c.abnormalDays() > 0)
                .sorted(SORT_NAME.equals(sort) ? byName() : byAbnormal()).toList();
        int start = (int) Math.min((long) page * size, shown.size());
        List<Computed> pageRows = shown.subList(start, Math.min(start + size, shown.size()));
        Map<UUID, EmployeeCard> cards = employees.cards(pageRows.stream().map(c -> c.member().id()).toList());
        List<DailyAttendanceResponse.Row> rows = pageRows.stream()
                .map(c -> new DailyAttendanceResponse.Row(cards.get(c.member().id()), c.member().orgUnitId(), c.totals(),
                        abnormalOnly ? c.days().stream().filter(this::abnormal).toList() : c.days()))
                .toList();
        List<ShiftBrief> briefs = usedShifts.stream().map(shiftById::get).sorted(
                Comparator.comparing(Shift::getStartTime).thenComparing(Shift::getName))
                .map(s -> new ShiftBrief(s.getId(), s.getCode(), s.getName(), s.getStartTime(), s.getEndTime(),
                        !s.getEndTime().isAfter(s.getStartTime()), s.isActive()))
                .toList();
        return new DailyAttendanceResponse(from, to, offset(coveredUntil, zone), offset(imports.latestImportAt(), zone),
                briefs, rows, shown.size(), page, size);
    }

    private EffectiveShifts effectiveShifts(Map<LocalDate, String> holidays) {
        Map<UUID, UUID> parents = new HashMap<>();
        Map<UUID, UUID> defaults = new HashMap<>();
        for (OrgUnit unit : orgUnits.findAll()) {
            if (unit.getParentId() != null) {
                parents.put(unit.getId(), unit.getParentId());
            }
            if (unit.getDefaultShiftId() != null) {
                defaults.put(unit.getId(), unit.getDefaultShiftId());
            }
        }
        return new EffectiveShifts(parents, defaults, workSchedule.current(), holidays);
    }

    private static Day toDay(DailyRecord record, UUID shiftId, Instant coveredUntil, Instant now, Duration marginAfter,
            ZoneId zone) {
        Instant start = record.date().atTime(record.shift().startTime()).atZone(zone).toInstant();
        Instant windowEnd = start.plus(Duration.ofMinutes(record.shift().lengthMinutes())).plus(marginAfter);
        boolean noLog = coveredUntil == null || start.isAfter(coveredUntil) || now.isBefore(windowEnd);
        Set<Flag> flags = EnumSet.noneOf(Flag.class);
        flags.addAll(record.flags());
        if (noLog) {
            flags.removeAll(JUDGED);
        }
        return new Day(record.date(), shiftId, offset(record.in(), zone), offset(record.out(), zone),
                record.workedMinutes(), record.lateMinutes(), noLog ? 0 : record.earlyLeaveMinutes(),
                flags.stream().map(Flag::name).sorted().toList(), record.holidayName(),
                record.leave() == null ? null : record.leave().name(), noLog);
    }

    /** Days with punches and no shift: In is the first punch, Out the last. */
    private static List<Day> noShiftDays(List<AttendanceProcessor.PunchUse> unassigned, ZoneId zone) {
        Map<LocalDate, List<Instant>> byDate = new TreeMap<>();
        unassigned.forEach(use -> byDate.computeIfAbsent(use.at().atZone(zone).toLocalDate(), d -> new ArrayList<>())
                .add(use.at()));
        List<Day> days = new ArrayList<>();
        byDate.forEach((date, list) -> days.add(new Day(date, null, offset(list.get(0), zone),
                list.size() > 1 ? offset(list.get(list.size() - 1), zone) : null, 0, 0, 0, List.of("NO_SHIFT"), null,
                null, false)));
        return days;
    }

    private boolean abnormal(Day day) {
        return day.lateMinutes() > 0 || day.earlyLeaveMinutes() > 0 || day.flags().contains(Flag.MISSING_IN.name())
                || day.flags().contains(Flag.MISSING_OUT.name()) || day.flags().contains(Flag.ABSENT.name());
    }

    private Totals totals(List<Day> days) {
        int worked = 0;
        int minutes = 0;
        int late = 0;
        int early = 0;
        int missing = 0;
        int absent = 0;
        int leave = 0;
        for (Day day : days) {
            worked += day.in() != null && day.out() != null ? 1 : 0;
            minutes += day.workedMinutes();
            late += day.lateMinutes() > 0 ? 1 : 0;
            early += day.earlyLeaveMinutes() > 0 ? 1 : 0;
            missing += day.flags().contains(Flag.MISSING_IN.name()) || day.flags().contains(Flag.MISSING_OUT.name())
                    ? 1 : 0;
            absent += day.flags().contains(Flag.ABSENT.name()) ? 1 : 0;
            leave += day.leave() != null ? 1 : 0;
        }
        return new Totals(worked, minutes, late, early, missing, absent, leave);
    }

    /** Most abnormal days first, then by name. */
    private static Comparator<Computed> byAbnormal() {
        return Comparator.comparingInt(Computed::abnormalDays).reversed().thenComparing(byName());
    }

    private static Comparator<Computed> byName() {
        return Comparator.comparing((Computed c) -> c.member().fullName()).thenComparing(c -> c.member().id());
    }

    private static LeavePart part(boolean morning, boolean afternoon) {
        return morning && !afternoon ? LeavePart.MORNING : afternoon && !morning ? LeavePart.AFTERNOON : LeavePart.WHOLE;
    }

    private static OffsetDateTime offset(Instant instant, ZoneId zone) {
        return instant == null ? null : instant.atZone(zone).toOffsetDateTime();
    }

    /** The active Employees the caller may see, narrowed by unit, Employee and a search on name or code. */
    private List<EmployeeMember> visibleMembers(AccessScope scope, Set<UUID> units, UUID employeeId, String q) {
        UUID self = scope.employeeFilter().selfEmployeeId();
        boolean viewer = scope.has(Permission.ATTENDANCE_VIEW);
        List<EmployeeMember> members = employees.activeMembers().stream()
                .filter(member -> viewer ? scope.coversEmployee(member.id(), member.orgUnitId())
                        : member.id().equals(self))
                .filter(member -> units == null || (member.orgUnitId() != null && units.contains(member.orgUnitId())))
                .filter(member -> employeeId == null || employeeId.equals(member.id()))
                .collect(Collectors.toList());
        String needle = q == null ? "" : fold(q);
        if (needle.isEmpty() || members.isEmpty()) {
            return members;
        }
        Map<UUID, EmployeeCard> cards = employees.cards(members.stream().map(EmployeeMember::id).toList());
        return members.stream().filter(member -> fold(member.fullName()).contains(needle)
                || fold(cards.get(member.id()).code()).contains(needle)).collect(Collectors.toList());
    }

    /** Lower case without accents, so "tri" finds "Trí". */
    static String fold(String text) {
        String plain = Normalizer.normalize(text.replace('đ', 'd').replace('Đ', 'D'), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return plain.toLowerCase().trim();
    }

    private static void checkQuery(LocalDate from, LocalDate to, String sort, int page, int size) {
        List<Map<String, String>> errors = new ArrayList<>();
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
        if (!SORT_ABNORMAL.equals(sort) && !SORT_NAME.equals(sort)) {
            errors.add(error("sort", "invalid"));
        }
        if (page < 0) {
            errors.add(error("page", "out_of_range"));
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            errors.add(error("size", "out_of_range"));
        }
        if (!errors.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request values are invalid")
                    .with("errors", errors);
        }
    }

    private static Map<String, String> error(String field, String code) {
        return Map.of("field", field, "code", code);
    }
}
