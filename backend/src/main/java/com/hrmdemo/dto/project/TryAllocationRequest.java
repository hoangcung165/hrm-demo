package com.hrmdemo.dto.project;

import java.time.LocalDate;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Thử phân bổ: what saving would do, nothing is saved.
 *
 * @param allocationId the allocation being edited, or null for a new one (then {@code employeeId} is required)
 * @param employeeId   ignored when {@code allocationId} is given
 */
public record TryAllocationRequest(@Schema(nullable = true) UUID allocationId,
        @Schema(nullable = true) UUID employeeId, Integer percent, LocalDate startDate, LocalDate endDate) {
}
