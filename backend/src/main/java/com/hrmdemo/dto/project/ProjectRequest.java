package com.hrmdemo.dto.project;

import java.time.LocalDate;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * A new Dự án. Every field is checked by the service, which reports all failing fields at once.
 *
 * @param code         Mã dự án: letters, digits, {@code . _ -}, up to 20; unique whatever the case; never changed
 * @param client       empty for an internal project
 * @param pmEmployeeId the PM, an active Employee; without "Quản lý mọi dự án" only the caller's own Employee
 * @param orgUnitId    Phòng ban phụ trách, an active Organization unit
 * @param status       PLANNED, ACTIVE, ON_HOLD or CLOSED
 * @param laborBudget  Ngân sách nhân sự in VND, or null
 */
public record ProjectRequest(String code, String name, @Schema(nullable = true) String client, UUID pmEmployeeId,
        UUID orgUnitId, LocalDate startDate, LocalDate endDate, String status,
        @Schema(nullable = true) Long laborBudget) {
}
