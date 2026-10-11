package com.hrmdemo.dto.project;

import java.time.LocalDate;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Replaces everything about a Dự án but its code; the fields are as in {@link ProjectRequest}. */
public record ProjectUpdateRequest(String name, @Schema(nullable = true) String client, UUID pmEmployeeId,
        UUID orgUnitId, LocalDate startDate, LocalDate endDate, String status,
        @Schema(nullable = true) Long laborBudget) {
}
