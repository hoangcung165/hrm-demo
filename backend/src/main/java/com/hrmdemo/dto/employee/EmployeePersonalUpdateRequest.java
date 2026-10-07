package com.hrmdemo.dto.employee;

/**
 * The edited "Cá nhân" part of an Employee: the full name and the personal fields, which it replaces. Field errors
 * use the same paths as on create: {@code fullName}, {@code personal.phone}, ...
 *
 * @param fullName trimmed, inner spaces collapsed; 1 to 150 characters
 */
public record EmployeePersonalUpdateRequest(
        String fullName,
        EmployeePersonalRequest personal) {
}
