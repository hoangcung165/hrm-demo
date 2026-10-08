package com.hrmdemo.dto.auth;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The Nhân viên (Employee) an Account is linked to, as shown next to the Account.
 *
 * @param orgUnitName null: directly under the company
 * @param status      the Employee's status; {@code INACTIVE} when the person left, while the link stays
 */
public record AccountEmployee(UUID employeeId, String fullName, String employeeCode,
        @Schema(nullable = true) String orgUnitName,
        @Schema(allowableValues = {"PROBATION", "OFFICIAL", "INACTIVE"}) String status) {
}
