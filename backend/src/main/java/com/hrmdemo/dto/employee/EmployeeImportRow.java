package com.hrmdemo.dto.employee;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One data row of an import file and what the import does with it. Every row has {@code row}, {@code status},
 * {@code fullName} and {@code idNumber} (as read; masked without EMPLOYEE_SENSITIVE_VIEW). An {@code EXISTING} row
 * also has {@code matchedBy} and, when the caller's scope covers that Employee, {@code existing}. A {@code VALID}
 * row also has the preview: the fields as they will be saved, with the codes resolved to names.
 *
 * @param matchedBy {@code CODE} (column Mã nhân viên) or {@code ID_NUMBER} (Số CCCD)
 * @param manager   the chosen Quản lý trực tiếp, or null: the new Employee follows the unit head
 */
public record EmployeeImportRow(
        int row,
        @Schema(allowableValues = {"VALID", "INVALID", "EXISTING"}) String status,
        @Schema(nullable = true) String fullName,
        @Schema(nullable = true) String idNumber,
        @Schema(nullable = true, allowableValues = {"CODE", "ID_NUMBER"}) String matchedBy,
        @Schema(nullable = true) EmployeeRef existing,
        @Schema(nullable = true) LocalDate dateOfBirth,
        @Schema(nullable = true, allowableValues = {"MALE", "FEMALE"}) String gender,
        @Schema(nullable = true) EmployeeImportRef orgUnit,
        @Schema(nullable = true) EmployeeImportRef position,
        @Schema(nullable = true) EmployeeRef manager,
        @Schema(nullable = true) LocalDate hireDate,
        @Schema(nullable = true, allowableValues = {"PROBATION", "OFFICIAL"}) String employeeStatus) {
}
