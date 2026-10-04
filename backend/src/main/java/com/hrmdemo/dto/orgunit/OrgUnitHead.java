package com.hrmdemo.dto.orgunit;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Trưởng đơn vị as shown on a unit. On the company node it is the legal representative, who is not
 * necessarily an Employee: then only {@code fullName} and {@code position} are set.
 */
public record OrgUnitHead(
        @Schema(nullable = true, description = "Null on the company node") UUID employeeId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String fullName,
        @Schema(nullable = true) String employeeCode,
        @Schema(nullable = true) String position,
        @Schema(nullable = true) String avatarUrl) {
}
