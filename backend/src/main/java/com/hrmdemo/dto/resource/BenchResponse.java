package com.hrmdemo.dto.resource;

import java.time.LocalDate;
import java.util.List;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Bench: the people whose highest Tải phân bổ in the period is under the bench threshold, lowest first.
 *
 * @param from    first day of the period (a week or a month)
 * @param to      last day of the period
 * @param total   people on the bench (every page)
 */
public record BenchResponse(LocalDate from, LocalDate to, String granularity, List<Row> items, long total, int page,
        int size, Summary summary, HeatmapResponse.Thresholds thresholds) {

    /**
     * @param peak           the highest load in the period, 0 without any allocation
     * @param nextAllocation the allocation that starts after the period, earliest first, or null
     * @param latestProject  the allocation that ends last among those that started by the end of the period (an
     *                       ongoing one counts), or null for someone who never had one
     */
    public record Row(EmployeeCard employee, int peak, @Schema(nullable = true) AllocationBrief nextAllocation,
            @Schema(nullable = true) AllocationBrief latestProject) {
    }

    /**
     * @param noAllocation   on the bench with no allocation at all in the period
     * @param belowThreshold on the bench with some allocation, under the threshold
     */
    public record Summary(int noAllocation, int belowThreshold) {
    }
}
