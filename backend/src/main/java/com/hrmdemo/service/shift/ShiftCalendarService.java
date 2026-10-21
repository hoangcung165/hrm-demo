package com.hrmdemo.service.shift;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.employee.EmployeeMember;
import com.hrmdemo.dto.shift.ShiftCalendarResponse;
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
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import com.hrmdemo.service.workschedule.WorkScheduleService;
import com.hrmdemo.service.workschedule.WorkWeek;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lịch ca: the effective Ca làm việc of every active Employee the caller may see, per day of a range of at most 62
 * days, paged by Employee. With SHIFT_VIEW the caller sees what their data scope covers (HR and Giám đốc the company, a
 * Line manager their unit and below, and themselves); without it only their own row. The rule for one day is
 * {@link EffectiveShifts}.
 */
@Service
@RequiredArgsConstructor
public class ShiftCalendarService {

    static final int MAX_DAYS = ShiftAssignmentService.MAX_DAYS;
    static final int MAX_PAGE_SIZE = 500;

    private final ShiftRepository shifts;
    private final ShiftAssignmentRepository assignments;
    private final OrgUnitRepository orgUnits;
    private final OrgUnitService orgUnitService;
    private final EmployeeService employees;
    private final CatalogService catalogs;
    private final WorkScheduleService workSchedule;
    private final AccessScopeService accessScopes;

    @Transactional(readOnly = true)
    public ShiftCalendarResponse calendar(CurrentAccount caller, LocalDate from, LocalDate to, UUID orgUnitId,
            UUID employeeId, UUID shiftId, int page, int size) {
        checkQuery(from, to, page, size);
        AccessScope scope = accessScopes.scopeOf(caller);
        Set<UUID> units = null;
        if (orgUnitId != null) {
            units = orgUnitService.selfAndDescendants(orgUnitId);
            if (units.isEmpty()) {
                throw new ApiException(HttpStatus.NOT_FOUND, "org_unit.not_found", "No such organization unit");
            }
        }
        List<EmployeeMember> visible = visibleMembers(scope, units, employeeId);

        WorkWeek week = workSchedule.current();
        Map<LocalDate, String> holidays = catalogs.holidayDays(from, to);
        List<OrgUnit> allUnits = orgUnits.findAll();
        Map<UUID, UUID> parents = new HashMap<>();
        Map<UUID, UUID> defaults = new HashMap<>();
        for (OrgUnit unit : allUnits) {
            if (unit.getParentId() != null) {
                parents.put(unit.getId(), unit.getParentId());
            }
            if (unit.getDefaultShiftId() != null) {
                defaults.put(unit.getId(), unit.getDefaultShiftId());
            }
        }
        EffectiveShifts effective = new EffectiveShifts(parents, defaults, week, holidays);

        Map<UUID, Map<LocalDate, UUID>> assigned = new HashMap<>();
        if (!visible.isEmpty()) {
            List<UUID> ids = visible.stream().map(EmployeeMember::id).toList();
            for (ShiftAssignment row : assignments.findByEmployeeIdInAndWorkDateBetween(ids, from, to)) {
                assigned.computeIfAbsent(row.getEmployeeId(), id -> new HashMap<>())
                        .put(row.getWorkDate(), row.getShiftId());
            }
        }

        // The cells of everyone first: the shift filter and the page both depend on them.
        Map<UUID, List<ShiftCalendarResponse.Cell>> cellsOf = new HashMap<>();
        List<EmployeeMember> shown = new ArrayList<>();
        for (EmployeeMember member : visible) {
            Map<LocalDate, UUID> own = assigned.getOrDefault(member.id(), Map.of());
            List<ShiftCalendarResponse.Cell> cells = new ArrayList<>();
            for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
                var cell = effective.of(member.orgUnitId(), day, own.get(day));
                if (cell.isPresent() && (shiftId == null || shiftId.equals(cell.get().shiftId()))) {
                    cells.add(new ShiftCalendarResponse.Cell(day, cell.get().shiftId(),
                            cell.get().source().name()));
                }
            }
            if (shiftId == null || !cells.isEmpty()) {
                cellsOf.put(member.id(), cells);
                shown.add(member);
            }
        }

        int start = (int) Math.min((long) page * size, shown.size());
        int end = Math.min(start + size, shown.size());
        List<EmployeeMember> pageMembers = shown.subList(start, end);
        Map<UUID, EmployeeCard> cards = employees.cards(pageMembers.stream().map(EmployeeMember::id).toList());
        List<ShiftCalendarResponse.Row> rows = new ArrayList<>();
        Set<UUID> usedShifts = new HashSet<>();
        for (EmployeeMember member : pageMembers) {
            List<ShiftCalendarResponse.Cell> cells = cellsOf.get(member.id());
            cells.forEach(cell -> usedShifts.add(cell.shiftId()));
            rows.add(new ShiftCalendarResponse.Row(cards.get(member.id()), member.orgUnitId(), cells));
        }
        List<ShiftCalendarResponse.ShiftBrief> briefs = shifts.findAllById(usedShifts).stream()
                .sorted(Comparator.comparing(Shift::getStartTime).thenComparing(Shift::getName))
                .map(shift -> new ShiftCalendarResponse.ShiftBrief(shift.getId(), shift.getCode(), shift.getName(),
                        shift.getStartTime(), shift.getEndTime(), !shift.getEndTime().isAfter(shift.getStartTime()),
                        shift.isActive()))
                .toList();
        List<ShiftCalendarResponse.Day> days = new ArrayList<>();
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            days.add(new ShiftCalendarResponse.Day(day, holidays.get(day), week.of(day).name()));
        }
        return new ShiftCalendarResponse(from, to, days, briefs, rows, shown.size(), page, size);
    }

    /** The active Employees the caller may see, by name, narrowed by unit and by Employee. */
    private List<EmployeeMember> visibleMembers(AccessScope scope, Set<UUID> units, UUID employeeId) {
        UUID self = scope.employeeFilter().selfEmployeeId();
        boolean viewer = scope.has(Permission.SHIFT_VIEW);
        return employees.activeMembers().stream()
                .filter(member -> viewer ? scope.coversEmployee(member.id(), member.orgUnitId())
                        : member.id().equals(self))
                .filter(member -> units == null || (member.orgUnitId() != null && units.contains(member.orgUnitId())))
                .filter(member -> employeeId == null || employeeId.equals(member.id()))
                .collect(Collectors.toList());
    }

    private static void checkQuery(LocalDate from, LocalDate to, int page, int size) {
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
