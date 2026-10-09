package com.hrmdemo.dto.employee;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * An Employee as a row of a list shows them: name and code, with their unit underneath ("NV00021 · Nhóm Web").
 *
 * @param orgUnitName null for an Employee directly under the company
 */
public record EmployeeCard(UUID id, String code, String fullName, @Schema(nullable = true) String orgUnitName) {
}
