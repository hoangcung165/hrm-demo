package com.hrmdemo.dto.resource;

import java.util.List;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Sắp hết dự án: allocations that end within the configured number of weeks, earliest end first.
 *
 * @param weeks the ending-soon setting in force
 * @param total rows that pass the filters (every page)
 */
public record EndingResponse(int weeks, List<Row> items, long total, int page, int size, Summary summary) {

    /**
     * @param daysLeft    days from today to the last day of the allocation (0: it ends today)
     * @param loadAfter   the Employee's load on the day after the allocation ends
     * @param next        the allocation that starts after this one ends, or null
     * @param withoutNext loadAfter is 0 and there is no next allocation: "Chưa có phân bổ tiếp theo"
     */
    public record Row(EmployeeCard employee, AllocationBrief allocation, int daysLeft, int loadAfter,
            @Schema(nullable = true) AllocationBrief next, boolean withoutNext) {
    }

    /** @param withoutNext rows with no next allocation, before the "only without next" filter */
    public record Summary(int endingSoon, int withoutNext) {
    }
}
