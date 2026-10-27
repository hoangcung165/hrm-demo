package com.hrmdemo.dto.leave;

import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeCard;

/**
 * Someone on approved leave on one day: who, which type, which part of that day, and the last day the request takes.
 *
 * @param part  {@code FULL}, {@code MORNING} or {@code AFTERNOON}: the part of that day the person is off
 * @param until the last day the request takes; after the day asked about when the request goes on, so a screen can
 *              say "đến 30/10"
 */
public record LeaveOnDay(UUID requestId, EmployeeCard employee, LeaveTypeRef leaveType, DayPart part,
        LocalDate until) {
}
