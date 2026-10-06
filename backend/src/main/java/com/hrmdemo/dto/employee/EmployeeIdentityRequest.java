package com.hrmdemo.dto.employee;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The identity numbers of an Employee (Trường nhạy cảm). Spaces inside a number are ignored. Each number is
 * unique in the company.
 *
 * @param idNumber              CCCD: required, exactly 12 digits
 * @param idIssueDate           not in the future, not before the date of birth
 * @param idIssuePlace          at most 150 characters
 * @param taxCode               MST: 10 digits (issued before 07/2025), or 12 digits equal to the CCCD
 * @param socialInsuranceNumber số BHXH: 10 digits, or 12 digits equal to the CCCD
 */
public record EmployeeIdentityRequest(
        String idNumber,
        @Schema(nullable = true) LocalDate idIssueDate,
        @Schema(nullable = true) String idIssuePlace,
        @Schema(nullable = true) String taxCode,
        @Schema(nullable = true) String socialInsuranceNumber) {
}
