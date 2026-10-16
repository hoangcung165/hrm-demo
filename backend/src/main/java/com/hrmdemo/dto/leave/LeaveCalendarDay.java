package com.hrmdemo.dto.leave;

import java.time.LocalDate;

/** One day a request takes: only days that count (a day off or a holiday inside the span is not listed). */
public record LeaveCalendarDay(LocalDate date, boolean morning, boolean afternoon) {
}
