package com.hrmdemo.dto.employee;

import java.time.LocalDate;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The "Công việc" part of a new or edited Employee.
 *
 * @param orgUnitId  null: directly under the company; otherwise an active unit
 * @param positionId required; an active item of the {@code positions} catalog
 * @param managerId  null: follow the unit head (Trưởng đơn vị); otherwise an active Employee
 * @param hireDate   required; at most 365 days ahead
 * @param status     {@code PROBATION} or {@code OFFICIAL}; on create optional (default PROBATION), on edit
 *                   required; {@code INACTIVE} is refused
 */
public record EmployeeJobRequest(
        @Schema(nullable = true) UUID orgUnitId,
        UUID positionId,
        @Schema(nullable = true) UUID managerId,
        LocalDate hireDate,
        @Schema(nullable = true, allowableValues = {"PROBATION", "OFFICIAL"}) String status) {
}
