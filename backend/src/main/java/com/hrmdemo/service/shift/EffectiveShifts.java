package com.hrmdemo.service.shift;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.workschedule.WorkDayKind;
import com.hrmdemo.service.workschedule.WorkWeek;

/**
 * The Ca làm việc an Employee works on a day: the Phân ca they have there, else the Ca mặc định of their Đơn vị tổ chức
 * (or of the nearest unit above that has one) when the day is a working day of the Lịch làm việc and not a holiday,
 * else none. An explicit assignment wins on any day, also a day off. A default never fills a weekend or a holiday.
 *
 * <p>Pure: built from the org tree, the Lịch làm việc and the holidays of a range, so the calendar and the attendance
 * processor (HRM-23) read the same rule. A shift that crosses midnight belongs to the day it starts, so it is the cell of
 * that day only.
 */
public final class EffectiveShifts {

    /** Where a day's shift comes from. */
    public enum Source {
        /** The Employee has a Phân ca on the day. */
        ASSIGNED,
        /** The Ca mặc định of the unit fills the working day. */
        DEFAULT
    }

    /** The shift of a day and where it comes from. */
    public record Cell(UUID shiftId, Source source) {
    }

    private final Map<UUID, UUID> parentOf;
    private final Map<UUID, UUID> defaultShiftOf;
    private final WorkWeek week;
    private final Map<LocalDate, String> holidays;
    private final Map<UUID, Optional<UUID>> inherited = new HashMap<>();

    /**
     * @param parentOf the parent unit of each unit (a top-level unit may be missing or map to nothing)
     * @param defaultShiftOf the Ca mặc định of each unit that has one
     * @param holidays the holidays of the range by day
     */
    public EffectiveShifts(Map<UUID, UUID> parentOf, Map<UUID, UUID> defaultShiftOf, WorkWeek week,
            Map<LocalDate, String> holidays) {
        this.parentOf = parentOf;
        this.defaultShiftOf = defaultShiftOf;
        this.week = week;
        this.holidays = holidays;
    }

    /** The Ca mặc định that applies to the unit: its own, else the nearest one above. Empty for no unit or none above. */
    public Optional<UUID> defaultShiftOf(UUID orgUnitId) {
        if (orgUnitId == null) {
            return Optional.empty();
        }
        Optional<UUID> known = inherited.get(orgUnitId);
        if (known != null) {
            return known;
        }
        Optional<UUID> found = Optional.empty();
        Set<UUID> seen = new HashSet<>();
        for (UUID unit = orgUnitId; unit != null && seen.add(unit); unit = parentOf.get(unit)) {
            UUID shift = defaultShiftOf.get(unit);
            if (shift != null) {
                found = Optional.of(shift);
                break;
            }
        }
        inherited.put(orgUnitId, found);
        return found;
    }

    /**
     * @param orgUnitId the unit the Employee belongs to, or null
     * @param assignedShiftId the shift of the Employee's Phân ca on the day, or null
     */
    public Optional<Cell> of(UUID orgUnitId, LocalDate day, UUID assignedShiftId) {
        if (assignedShiftId != null) {
            return Optional.of(new Cell(assignedShiftId, Source.ASSIGNED));
        }
        if (isWorkingDay(day)) {
            return defaultShiftOf(orgUnitId).map(shift -> new Cell(shift, Source.DEFAULT));
        }
        return Optional.empty();
    }

    /** A working day of the Lịch làm việc (whole or half) that is not a holiday. */
    public boolean isWorkingDay(LocalDate day) {
        return !holidays.containsKey(day) && week.of(day) != WorkDayKind.OFF;
    }
}
