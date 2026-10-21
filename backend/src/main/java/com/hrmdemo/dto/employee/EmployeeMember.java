package com.hrmdemo.dto.employee;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** An active Employee as a roster needs them: who, and the unit they belong to. */
public record EmployeeMember(UUID id, String fullName, @Schema(nullable = true) UUID orgUnitId) {
}
