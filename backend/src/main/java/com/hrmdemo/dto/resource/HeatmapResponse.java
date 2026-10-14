package com.hrmdemo.dto.resource;

import java.time.LocalDate;
import java.util.List;

import com.hrmdemo.dto.employee.EmployeeCard;

/**
 * The resource heatmap: one row per active Employee, one cell per column holding the highest Tải phân bổ of that week
 * or month. The thresholds in force come with it, so the page colours the cells without a second call.
 *
 * @param granularity WEEK or MONTH
 * @param total       rows that pass the filters (every page)
 */
public record HeatmapResponse(LocalDate from, LocalDate to, String granularity, List<Column> columns,
        List<Row> items, long total, int page, int size, Summary summary, Thresholds thresholds) {

    /** A week (Monday to Sunday) or a month. */
    public record Column(LocalDate from, LocalDate to) {
    }

    /**
     * @param cells the highest Tải phân bổ of each column, in the order of {@code columns}
     * @param peak  the highest of the cells
     */
    public record Row(EmployeeCard employee, List<Integer> cells, int peak) {
    }

    /**
     * Counts over everyone who passes the search and unit filters, before the load level filter.
     *
     * @param people             people in the heatmap
     * @param overloadedNow      people above 100% on some day of the current week
     * @param overloadedInWindow people above 100% on some day of the columns
     */
    public record Summary(int people, int overloadedNow, int overloadedInWindow) {
    }

    public record Thresholds(int benchPercent, int nearFullPercent, int endingWeeks) {
    }
}
