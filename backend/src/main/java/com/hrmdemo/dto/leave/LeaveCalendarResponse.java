package com.hrmdemo.dto.leave;

import java.time.LocalDate;
import java.util.List;

/** Who is off in a range of days, and the holidays of that range. Entries are ordered by first day, then by name. */
public record LeaveCalendarResponse(LocalDate from, LocalDate to, List<LeaveCalendarHoliday> holidays,
        List<LeaveCalendarEntry> entries) {
}
