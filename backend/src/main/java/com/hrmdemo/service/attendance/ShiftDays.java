package com.hrmdemo.service.attendance;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.shift.ShiftAssignment;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.repository.shift.ShiftAssignmentRepository;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.shift.EffectiveShifts;
import com.hrmdemo.service.workschedule.WorkScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * The Ca làm việc of each day of a range for a set of Employees: their Phân ca, else the Ca mặc định of their unit on a
 * working day (the rule of {@link EffectiveShifts}, as the Công theo ngày reads it).
 */
@Component
@RequiredArgsConstructor
class ShiftDays {

    private final ShiftAssignmentRepository assignments;
    private final OrgUnitRepository orgUnits;
    private final CatalogService catalogs;
    private final WorkScheduleService workSchedule;

    /**
     * @param unitOf the unit of each Employee (an Employee directly under the company maps to null)
     * @return the shift id by day for each Employee, days without a shift left out
     */
    Map<UUID, Map<LocalDate, UUID>> of(Map<UUID, UUID> unitOf, LocalDate from, LocalDate to) {
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
        EffectiveShifts effective = new EffectiveShifts(parents, defaults, workSchedule.current(),
                catalogs.holidayDays(from, to));
        Map<UUID, Map<LocalDate, UUID>> assigned = new HashMap<>();
        if (!unitOf.isEmpty()) {
            for (ShiftAssignment row : assignments.findByEmployeeIdInAndWorkDateBetween(unitOf.keySet(), from, to)) {
                assigned.computeIfAbsent(row.getEmployeeId(), id -> new HashMap<>())
                        .put(row.getWorkDate(), row.getShiftId());
            }
        }
        Map<UUID, Map<LocalDate, UUID>> result = new HashMap<>();
        unitOf.forEach((employee, unit) -> {
            Map<LocalDate, UUID> own = assigned.getOrDefault(employee, Map.of());
            Map<LocalDate, UUID> days = new TreeMap<>();
            for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
                LocalDate date = day;
                effective.of(unit, day, own.get(day)).ifPresent(cell -> days.put(date, cell.shiftId()));
            }
            result.put(employee, days);
        });
        return result;
    }
}
