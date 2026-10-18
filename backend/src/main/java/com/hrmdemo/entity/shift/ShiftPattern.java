package com.hrmdemo.entity.shift;

import java.time.Duration;
import java.time.LocalTime;

/**
 * The working pattern of a {@link Shift}, already validated, with the minutes it implies. All the arithmetic is on
 * offsets from the start time, so a shift (or a break) that crosses midnight needs no special case.
 */
public record ShiftPattern(String name, LocalTime startTime, LocalTime endTime, LocalTime breakStart,
        LocalTime breakEnd, int lateToleranceMinutes, int earlyToleranceMinutes, RoundingMode roundingMode,
        Integer roundingMinutes) {

    private static final int DAY = 24 * 60;
    private static final int NIGHT_FROM = 22 * 60;
    private static final int NIGHT_TO = 6 * 60;

    /** True when the shift ends on the day after it starts. */
    public boolean crossesMidnight() {
        return !endTime.isAfter(startTime);
    }

    /** Minutes from the start to the end; 1 to 1439. */
    public int lengthMinutes() {
        return offset(endTime);
    }

    /** Minutes from the start of the shift to the start of the break; empty when the shift has none. */
    public Integer breakStartOffset() {
        return breakStart == null ? null : offset(breakStart);
    }

    /** Minutes from the start of the shift to the end of the break; empty when the shift has none. */
    public Integer breakEndOffset() {
        return breakEnd == null ? null : offset(breakEnd);
    }

    /** True when the break is non-empty and lies within the shift (it may cross midnight with it). */
    public boolean breakInsideShift() {
        if (breakStart == null || breakEnd == null) {
            return true;
        }
        int from = offset(breakStart);
        int to = offset(breakEnd);
        return from < to && to <= lengthMinutes();
    }

    public int breakMinutes() {
        return breakStart == null || breakEnd == null ? 0 : offset(breakEnd) - offset(breakStart);
    }

    /** The minutes a person is expected to work: the length of the shift minus the break. */
    public int scheduledMinutes() {
        return lengthMinutes() - breakMinutes();
    }

    /** Scheduled minutes that fall between 22:00 and 06:00 (the break does not count). */
    public int nightMinutes() {
        int length = lengthMinutes();
        int from = breakStart == null ? length : offset(breakStart);
        int to = breakEnd == null ? length : offset(breakEnd);
        int start = startTime.getHour() * 60 + startTime.getMinute();
        int night = 0;
        for (int minute = 0; minute < length; minute++) {
            if (minute >= from && minute < to) {
                continue;
            }
            int clock = (start + minute) % DAY;
            if (clock >= NIGHT_FROM || clock < NIGHT_TO) {
                night++;
            }
        }
        return night;
    }

    private int offset(LocalTime time) {
        int minutes = (int) Duration.between(startTime, time).toMinutes();
        return Math.floorMod(minutes, DAY);
    }
}
