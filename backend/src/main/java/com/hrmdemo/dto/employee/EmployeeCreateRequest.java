package com.hrmdemo.dto.employee;

/**
 * A new Employee. There is no code: the server issues the next Mã nhân viên. The identity numbers may be
 * entered without EMPLOYEE_SENSITIVE_VIEW; the response then shows them masked.
 *
 * @param fullName trimmed, inner spaces collapsed; 1 to 150 characters
 */
public record EmployeeCreateRequest(
        String fullName,
        EmployeePersonalRequest personal,
        EmployeeIdentityRequest identity,
        EmployeeJobRequest job) {
}
