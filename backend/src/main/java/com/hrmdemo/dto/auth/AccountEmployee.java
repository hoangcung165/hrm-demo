package com.hrmdemo.dto.auth;

import java.util.UUID;

/** The Nhân viên (Employee) an Account is linked to, as shown next to the Account. Arrives with HRM-06. */
public record AccountEmployee(UUID employeeId, String fullName, String employeeCode, String orgUnitName) {
}
