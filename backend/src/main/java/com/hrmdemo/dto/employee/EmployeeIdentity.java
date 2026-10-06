package com.hrmdemo.dto.employee;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The identity numbers of a profile. With {@code masked} true (the caller lacks EMPLOYEE_SENSITIVE_VIEW and
 * this is not its own profile) every digit of a number but the last four is "•", so the length stays. A
 * missing number is null either way. There is no way to reveal a masked number.
 */
public record EmployeeIdentity(
        boolean masked,
        String idNumber,
        @Schema(nullable = true) LocalDate idIssueDate,
        @Schema(nullable = true) String idIssuePlace,
        @Schema(nullable = true) String taxCode,
        @Schema(nullable = true) String socialInsuranceNumber) {
}
