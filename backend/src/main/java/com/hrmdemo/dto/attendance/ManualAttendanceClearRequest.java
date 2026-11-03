package com.hrmdemo.dto.attendance;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Clear the Công thủ công of people (or of a unit and the units below it) from {@code from} to {@code to}, both
 * included, or on {@code days} of that range only.
 */
public record ManualAttendanceClearRequest(List<UUID> employeeIds, UUID orgUnitId, LocalDate from, LocalDate to,
        List<LocalDate> days) {
}
