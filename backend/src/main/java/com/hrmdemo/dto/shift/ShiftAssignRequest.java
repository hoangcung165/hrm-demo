package com.hrmdemo.dto.shift;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Assign one Ca làm việc to people for a range of days, replacing what they have there. Give either
 * {@code employeeIds} or {@code orgUnitId}, not both.
 *
 * @param shiftId an active shift
 * @param employeeIds up to 500 active Employees
 * @param orgUnitId an Đơn vị tổ chức: its active Employees and those of every unit below it (up to 500)
 * @param from first day, at most 62 days up to {@code to}
 * @param weekdays the weekdays to cover; left out means every weekday
 * @param includeDays days of the range covered even when they are a day off of the Lịch làm việc or a holiday
 */
public record ShiftAssignRequest(UUID shiftId, List<UUID> employeeIds, UUID orgUnitId, LocalDate from, LocalDate to,
        List<DayOfWeek> weekdays, List<LocalDate> includeDays) {
}
