package com.hrmdemo.dto.leave;

import java.time.LocalDate;

/** A Ngày lễ in the range, so the calendar can mark it. */
public record LeaveCalendarHoliday(LocalDate date, String name) {
}
