package com.hrmdemo.dto.leave;

import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeCard;

/**
 * One Đơn nghỉ on the calendar: who, which type, whether it is approved or still waiting, and the days of it that fall
 * in the range asked for.
 *
 * @param status {@code APPROVED} or {@code PENDING}
 */
public record LeaveCalendarEntry(UUID requestId, EmployeeCard employee, LeaveTypeRef leaveType,
        LeaveRequestStatus status, List<LeaveCalendarDay> days) {
}
