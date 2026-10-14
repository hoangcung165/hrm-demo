package com.hrmdemo.dto.resource;

import java.time.LocalDate;
import java.util.List;

import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.project.LoadPeriodView;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * What one heatmap cell hides: an Employee's Tải phân bổ over the days of the cell, period by period, and the
 * allocations behind it.
 *
 * @param position       Chức danh of the Employee, or null
 * @param peak           the highest load on any day of the range, 0 without allocations
 * @param periods        runs of days with the same load, each naming the projects that add up
 * @param allocations    the allocations that touch the range, earliest start first
 * @param nextAllocation when no allocation touches the range: the one that starts next, or null
 */
public record CellDetailResponse(EmployeeCard employee, @Schema(nullable = true) String position, LocalDate from,
        LocalDate to, int peak, boolean overloaded, List<LoadPeriodView> periods, List<AllocationRef> allocations,
        @Schema(nullable = true) AllocationRef nextAllocation) {

    /**
     * One allocation as the cell detail lists it.
     *
     * @param status UPCOMING (starts after today), RUNNING or ENDED (ended before today)
     */
    public record AllocationRef(java.util.UUID id, java.util.UUID projectId, String projectCode, String projectName,
            @Schema(nullable = true) CatalogItemRef projectRole, int percent, LocalDate startDate,
            LocalDate endDate, String status) {
    }
}
