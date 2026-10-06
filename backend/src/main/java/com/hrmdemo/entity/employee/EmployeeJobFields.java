package com.hrmdemo.entity.employee;

import java.time.LocalDate;
import java.util.UUID;

/**
 * The "Công việc" fields of an {@link Employee}, already checked by the service.
 *
 * @param orgUnitId null: directly under the company
 * @param managerId null: follows the unit head (Trưởng đơn vị)
 */
public record EmployeeJobFields(UUID orgUnitId, UUID positionId, UUID managerId, LocalDate hireDate,
        EmployeeStatus status) {
}
