package com.hrmdemo.service.shift;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.hrmdemo.service.workschedule.WorkWeek;
import com.hrmdemo.dto.workschedule.WorkDayKind;

/**
 * Which days of a range a Phân ca call covers. A day is covered when its weekday is chosen (all weekdays when none
 * is) and it is a working day of the Lịch làm việc and not a holiday. A day listed explicitly is covered whatever it
 * is. Chosen weekdays that are days off or holidays are reported as skipped, so the caller sees why a day has no shift.
 */
final class ShiftDaySelection {

    /** Why a day the call asked for was left out. */
    enum Reason {
        HOLIDAY,
        DAY_OFF
    }

    record Skipped(LocalDate date, Reason reason, String name) {
    }

    record Result(List<LocalDate> days, List<Skipped> skipped) {
    }

    private ShiftDaySelection() {
    }

    /**
     * @param weekdays the weekdays to cover; null or empty means every weekday
     * @param holidays the holidays of the range by day, with their names
     * @param explicit days covered even when they are days off or holidays
     */
    static Result of(LocalDate from, LocalDate to, Set<DayOfWeek> weekdays, WorkWeek week,
            Map<LocalDate, String> holidays, Set<LocalDate> explicit) {
        List<LocalDate> days = new ArrayList<>();
        List<Skipped> skipped = new ArrayList<>();
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            if (explicit.contains(day)) {
                days.add(day);
                continue;
            }
            if (weekdays != null && !weekdays.isEmpty() && !weekdays.contains(day.getDayOfWeek())) {
                continue;
            }
            String holiday = holidays.get(day);
            if (holiday != null) {
                skipped.add(new Skipped(day, Reason.HOLIDAY, holiday));
            } else if (week.of(day) == WorkDayKind.OFF) {
                skipped.add(new Skipped(day, Reason.DAY_OFF, null));
            } else {
                days.add(day);
            }
        }
        return new Result(days, skipped);
    }
}
