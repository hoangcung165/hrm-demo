package com.hrmdemo.dto.workschedule;

import java.time.DayOfWeek;
import java.util.Map;

/** A new Lịch làm việc: all seven weekdays, at least one of them a working day. */
public record WorkScheduleRequest(Map<DayOfWeek, WorkDayKind> days) {
}
