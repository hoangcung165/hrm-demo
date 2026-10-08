package com.hrmdemo.dto.employee;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The "Công việc" part of a profile.
 *
 * @param orgUnit       null: directly under the company; with the name of the unit above it, as in list rows
 * @param manager       the effective Quản lý trực tiếp, or null when there is none
 * @param managerSource {@code ASSIGNED}: chosen by HR. {@code UNIT_HEAD}: follows the Trưởng đơn vị of the unit,
 *                      or of the nearest unit above with a head other than the Employee, live
 */
public record EmployeeJob(
        @Schema(nullable = true) EmployeeUnitRef orgUnit,
        AssignmentRef position,
        @Schema(nullable = true) EmployeeRef manager,
        @Schema(allowableValues = {"UNIT_HEAD", "ASSIGNED"}) String managerSource,
        LocalDate hireDate) {
}
