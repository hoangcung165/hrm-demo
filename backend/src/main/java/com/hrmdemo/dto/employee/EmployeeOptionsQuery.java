package com.hrmdemo.dto.employee;

import java.util.UUID;

/**
 * Query of the employee picker, as it arrives: the service checks every value.
 *
 * @param page            page number from 0
 * @param size            rows per page, 1 to 50
 * @param q               part of the full name or the employee code; case and accents do not matter
 * @param orgUnitId       one unit
 * @param includeSubUnits with {@code orgUnitId}: also the Employees of every unit below it
 * @param status          comma-separated statuses; empty means the active ones ({@code PROBATION,OFFICIAL})
 * @param excludeId       an Employee to leave out, e.g. the one being edited
 */
public record EmployeeOptionsQuery(int page, int size, String q, UUID orgUnitId, boolean includeSubUnits,
        String status, UUID excludeId) {
}
