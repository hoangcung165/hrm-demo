package com.hrmdemo.dto.employee;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The "Cá nhân" part of a new or edited Employee. The service checks and normalizes every field and answers
 * {@code validation.invalid} with {@code errors[].field} such as {@code personal.phone}.
 *
 * @param dateOfBirth   required; after 1900-01-01, before today, at least 15 years before the hire date
 * @param gender        required; as on the CCCD
 * @param personalEmail stored in lower case; at most 254 characters
 * @param address       at most 500 characters
 */
public record EmployeePersonalRequest(
        LocalDate dateOfBirth,
        @Schema(allowableValues = {"MALE", "FEMALE"}) String gender,
        @Schema(nullable = true) String personalEmail,
        @Schema(nullable = true) String phone,
        @Schema(nullable = true) String address,
        @Schema(nullable = true) EmergencyContact emergencyContact) {
}
