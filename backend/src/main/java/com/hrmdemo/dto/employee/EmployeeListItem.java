package com.hrmdemo.dto.employee;

import java.time.LocalDate;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One row of the employee list. No identity numbers: a row is the same for every caller who may see it.
 *
 * @param orgUnit null: directly under the company
 * @param manager the effective Quản lý trực tiếp (chosen, or the unit head followed live), or null
 */
public record EmployeeListItem(
        UUID id,
        String code,
        String fullName,
        @Schema(allowableValues = {"PROBATION", "OFFICIAL", "INACTIVE"}) String status,
        @Schema(nullable = true) EmployeeUnitRef orgUnit,
        @Schema(nullable = true) AssignmentRef position,
        @Schema(nullable = true) EmployeeRef manager,
        LocalDate hireDate,
        @Schema(nullable = true) String phone,
        @Schema(nullable = true) String personalEmail) {
}
