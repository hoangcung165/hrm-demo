package com.hrmdemo.dto.project;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The "Dự án" tab of an Employee's profile: every allocation they ever had, newest first, and their Tải phân bổ over
 * the next 12 weeks. Read-only: allocations are changed on the project.
 */
public record EmployeeProjectsResponse(List<Item> items, Strip strip) {

    /**
     * One allocation with its project.
     *
     * @param projectStatus status of the project: PLANNED, ACTIVE, ON_HOLD or CLOSED
     * @param status        UPCOMING (starts after today), RUNNING or ENDED (ended before today)
     */
    public record Item(UUID id, UUID projectId, String projectCode, String projectName,
            @Schema(nullable = true) String client, String projectStatus, @Schema(nullable = true) EmployeeCard pm,
            @Schema(nullable = true) CatalogItemRef projectRole, int percent, LocalDate startDate,
            LocalDate endDate, String status) {
    }

    /**
     * The load strip: one cell per week, each the highest Tải phân bổ of that week (same rule as the heatmap).
     *
     * @param from          Monday of the current week
     * @param to            last day of the twelfth week
     * @param firstOverload the first period above 100% in the 12 weeks with the projects that add up, or null
     */
    public record Strip(LocalDate from, LocalDate to, List<Cell> cells, boolean overloaded,
            @Schema(nullable = true) LoadPeriodView firstOverload) {
    }

    public record Cell(LocalDate from, LocalDate to, int peak) {
    }
}
