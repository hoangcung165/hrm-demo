package com.hrmdemo.dto.employee;

import java.util.UUID;

/**
 * The unit or the Chức danh an Employee is assigned to. {@code active} is false when the unit or the catalog
 * item was deactivated after it was assigned: it stays on the record.
 */
public record AssignmentRef(UUID id, String code, String name, boolean active) {
}
