package com.hrmdemo.dto.employee;

import java.util.UUID;

/**
 * Query of the employee list, as it arrives: the service checks every value.
 *
 * @param page            page number from 0
 * @param size            rows per page, 1 to 100
 * @param q               part of the full name or the employee code; case and accents do not matter
 * @param orgUnitId       one unit
 * @param includeSubUnits with {@code orgUnitId}: also the Employees of every unit below it
 * @param positionId      one Chức danh
 * @param status          comma-separated {@code PROBATION}, {@code OFFICIAL}, {@code INACTIVE}; empty means all
 * @param nationality     ISO alpha-2 country code; null/empty means any
 * @param sort            {@code code}, {@code fullName} or {@code hireDate}, optionally followed by {@code ,asc} or
 *                        {@code ,desc}
 */
public record EmployeeListQuery(int page, int size, String q, UUID orgUnitId, boolean includeSubUnits,
        UUID positionId, String status, String sort, String nationality) {
    /** Compatibility with callers that do not filter nationality. */
    public EmployeeListQuery(int page, int size, String q, UUID orgUnitId, boolean includeSubUnits,
            UUID positionId, String status, String sort) {
        this(page, size, q, orgUnitId, includeSubUnits, positionId, status, sort, null);
    }
}
