package com.hrmdemo.dto.employee;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** One Employee profile (hồ sơ nhân viên). */
public record EmployeeResponse(
        UUID id,
        String code,
        String fullName,
        @Schema(allowableValues = {"PROBATION", "OFFICIAL", "INACTIVE"}) String status,
        EmployeePersonal personal,
        EmployeeIdentity identity,
        EmployeeJob job,
        Instant createdAt,
        Instant updatedAt) {
}
