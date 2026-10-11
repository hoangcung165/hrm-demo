package com.hrmdemo.dto.project;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeCard;

/**
 * One Phân bổ of a project.
 *
 * @param status            UPCOMING (starts after today), RUNNING or ENDED (ended before today)
 * @param peakLoad          the Employee's highest Tải phân bổ across every project within the allocation's range
 *                          (from today on unless it has ended)
 * @param overloadedPeriods the periods of that range above 100%
 */
public record AllocationResponse(UUID id, UUID projectId, EmployeeCard employee, CatalogItemRef projectRole,
        int percent, LocalDate startDate, LocalDate endDate, String status, int peakLoad,
        List<LoadPeriodView> overloadedPeriods) {
}
