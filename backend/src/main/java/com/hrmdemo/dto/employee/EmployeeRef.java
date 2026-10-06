package com.hrmdemo.dto.employee;

import java.util.UUID;

/** Just enough of an Employee to name it, e.g. a Quản lý trực tiếp or the holder of a number in a conflict. */
public record EmployeeRef(UUID id, String code, String fullName) {
}
