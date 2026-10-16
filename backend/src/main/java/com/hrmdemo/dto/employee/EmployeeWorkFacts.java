package com.hrmdemo.dto.employee;

import java.time.LocalDate;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * What other features need to know of an Employee's employment (leave balances, absences): the card, the unit, the
 * hire date and whether they still work here.
 */
public record EmployeeWorkFacts(EmployeeCard card, @Schema(nullable = true) UUID orgUnitId, LocalDate hireDate,
        boolean active) {
}
