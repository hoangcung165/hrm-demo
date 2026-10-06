package com.hrmdemo.dto.employee;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The unit of an Employee in a list row. {@code active} is false when the unit was deactivated after it was
 * assigned.
 *
 * @param parentName the unit above, or null when the unit sits directly under the company
 */
public record EmployeeUnitRef(UUID id, String code, String name, boolean active,
        @Schema(nullable = true) String parentName) {
}
