package com.hrmdemo.dto.dashboard;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Nhân viên for the people charts of the Tổng quan page, within the caller's data scope.
 *
 * @param date   the company's day the numbers are for
 * @param byUnit active Employees per Organization unit they belong to directly, the largest first; Employees directly
 *               under the company come as one entry with no unit, when there are any
 * @param months the last 6 months, the oldest first and the current one last (its numbers are "this month's joins and
 *               leaves"); a month without any shows 0
 */
public record HeadcountResponse(LocalDate date, List<UnitCount> byUnit, List<MonthFlow> months) {

    /** @param orgUnitId null for the Employees directly under the company */
    public record UnitCount(@Schema(nullable = true) UUID orgUnitId, @Schema(nullable = true) String orgUnitName,
            int count) {
    }

    /**
     * @param month  {@code yyyy-MM}
     * @param joins  Employees whose hire date falls in the month (up to today for the current one), whatever their
     *               status now
     * @param leaves Employees whose last working day falls in the month
     */
    public record MonthFlow(String month, int joins, int leaves) {
    }
}
