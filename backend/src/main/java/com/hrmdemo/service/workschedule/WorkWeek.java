package com.hrmdemo.service.workschedule;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.Map;

import com.hrmdemo.dto.workschedule.WorkDayKind;

/**
 * The Lịch làm việc of the company: what each weekday is. Until a company sets its own it is Monday to Friday, whole
 * days, and the weekend off. Per-Employee and per-shift schedules come with HRM-22.
 */
public record WorkWeek(Map<DayOfWeek, WorkDayKind> days) {

    public static final WorkWeek DEFAULT = new WorkWeek(Map.of(
            DayOfWeek.MONDAY, WorkDayKind.FULL, DayOfWeek.TUESDAY, WorkDayKind.FULL,
            DayOfWeek.WEDNESDAY, WorkDayKind.FULL, DayOfWeek.THURSDAY, WorkDayKind.FULL,
            DayOfWeek.FRIDAY, WorkDayKind.FULL, DayOfWeek.SATURDAY, WorkDayKind.OFF, DayOfWeek.SUNDAY, WorkDayKind.OFF));

    public WorkWeek {
        EnumMap<DayOfWeek, WorkDayKind> copy = new EnumMap<>(DayOfWeek.class);
        for (DayOfWeek day : DayOfWeek.values()) {
            copy.put(day, days.getOrDefault(day, WorkDayKind.OFF));
        }
        days = Map.copyOf(copy);
    }

    public WorkDayKind of(DayOfWeek day) {
        return days.get(day);
    }

    public WorkDayKind of(LocalDate date) {
        return of(date.getDayOfWeek());
    }
}
