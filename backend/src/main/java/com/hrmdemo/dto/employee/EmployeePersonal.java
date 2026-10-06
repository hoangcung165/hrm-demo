package com.hrmdemo.dto.employee;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/** The "Cá nhân" part of a profile. */
public record EmployeePersonal(
        LocalDate dateOfBirth,
        @Schema(allowableValues = {"MALE", "FEMALE"}) String gender,
        @Schema(nullable = true) String personalEmail,
        @Schema(nullable = true) String phone,
        @Schema(nullable = true) String address,
        @Schema(nullable = true) EmergencyContact emergencyContact) {
}
