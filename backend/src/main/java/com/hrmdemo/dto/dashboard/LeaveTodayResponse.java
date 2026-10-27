package com.hrmdemo.dto.dashboard;

import java.time.LocalDate;
import java.util.List;

import com.hrmdemo.dto.leave.LeaveOnDay;

/** Who is on approved leave on one day of the company, by name. Waiting requests are not shown. */
public record LeaveTodayResponse(LocalDate date, List<LeaveOnDay> entries) {
}
