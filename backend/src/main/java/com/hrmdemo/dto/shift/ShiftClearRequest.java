package com.hrmdemo.dto.shift;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Clear the Phân ca of people (or of a unit and the units below it) from {@code from} to {@code to}, both included. */
public record ShiftClearRequest(List<UUID> employeeIds, UUID orgUnitId, LocalDate from, LocalDate to) {
}
