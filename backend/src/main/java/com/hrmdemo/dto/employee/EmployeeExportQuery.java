package com.hrmdemo.dto.employee;

import java.util.UUID;

/**
 * Filters of the Excel export: the employee list's filters without the paging, as they arrive. The service checks
 * every value, as for the list.
 *
 * @see EmployeeListQuery
 */
public record EmployeeExportQuery(String q, UUID orgUnitId, boolean includeSubUnits, UUID positionId, String status,
        String sort) {
}
