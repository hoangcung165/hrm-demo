package com.hrmdemo.entity.employee;

import java.time.LocalDate;

/** The "Cá nhân" fields of an {@link Employee}, already checked and normalized by the service. */
public record EmployeePersonalFields(String fullName, LocalDate dateOfBirth, Gender gender, String personalEmail,
        String phone, String address, String emergencyContactName, String emergencyContactRelationship,
        String emergencyContactPhone) {
}
