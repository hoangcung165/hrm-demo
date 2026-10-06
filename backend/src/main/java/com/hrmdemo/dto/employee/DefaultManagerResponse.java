package com.hrmdemo.dto.employee;

import io.swagger.v3.oas.annotations.media.Schema;

/** What "follow the unit head" resolves to; {@code manager} is null when there is none. */
public record DefaultManagerResponse(@Schema(nullable = true) EmployeeRef manager) {
}
