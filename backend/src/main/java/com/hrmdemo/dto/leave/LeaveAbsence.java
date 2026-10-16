package com.hrmdemo.dto.leave;

import java.time.LocalDate;

import com.hrmdemo.dto.employee.EmployeeCard;

/** Someone else of the same unit who is off (or asked to be) on some of the same days. */
public record LeaveAbsence(EmployeeCard employee, LeaveTypeRef leaveType, LocalDate startDate, DayPart startPart,
        LocalDate endDate, DayPart endPart, LeaveRequestStatus status) {
}
