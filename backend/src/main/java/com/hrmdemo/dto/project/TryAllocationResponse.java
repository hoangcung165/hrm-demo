package com.hrmdemo.dto.project;

import java.time.LocalDate;
import java.util.List;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * What saving one Phân bổ would do to its Employee's Tải phân bổ.
 *
 * @param periods             the load from the first day of the allocation's first month to its last day
 * @param peak                the highest load within the allocation's range
 * @param overloadedPeriods   the periods above 100% within the allocation's range; empty when nobody is overloaded
 * @param suggestedMaxPercent the highest percent that keeps the range at or below 100%; null when nothing is
 *                            overloaded or no percent fits
 * @param suggestedStart      the first start day after the overlap; null when nothing is overloaded or the overlap
 *                            runs to the end
 */
public record TryAllocationResponse(EmployeeCard employee, int peak, boolean overloaded,
        List<LoadPeriodView> periods, List<LoadPeriodView> overloadedPeriods,
        @Schema(nullable = true) Integer suggestedMaxPercent, @Schema(nullable = true) LocalDate suggestedStart) {
}
