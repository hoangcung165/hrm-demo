package com.hrmdemo.dto.dashboard;

import java.time.LocalDate;

/**
 * The numbers of the Tổng quan tiles for the caller's Phạm vi truy cập, on one day of the company.
 *
 * @param date         the company's day the numbers are for
 * @param employees    active Employees (Thử việc and Chính thức)
 * @param inProbation  of those, the ones in Thử việc
 * @param onLeaveToday Employees on approved leave on {@code date}, a half day included: the rows of
 *                     {@code GET /api/dashboard/leave-today}
 * @param workingToday {@code employees} minus those off the whole day; someone on a half day still works. Until
 *                     attendance feeds it (Demo v2) this is the number, not a count of punches.
 */
public record DashboardTilesResponse(LocalDate date, int employees, int inProbation, int onLeaveToday,
        int workingToday) {
}
