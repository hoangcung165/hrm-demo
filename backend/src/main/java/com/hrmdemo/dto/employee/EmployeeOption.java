package com.hrmdemo.dto.employee;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** One Employee in a picker: directory data only. */
public record EmployeeOption(
        UUID id,
        String code,
        String fullName,
        @Schema(allowableValues = {"PROBATION", "OFFICIAL", "INACTIVE"}) String status,
        @Schema(nullable = true, description = "Null: directly under the company") String orgUnitName,
        @Schema(nullable = true) String positionName) {
}
