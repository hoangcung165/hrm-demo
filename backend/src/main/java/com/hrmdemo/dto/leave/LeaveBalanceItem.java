package com.hrmdemo.dto.leave;

/** A Loại nghỉ with the Employee's balance of it, and who pays it. */
public record LeaveBalanceItem(LeaveTypeRef leaveType, LeavePay pay, boolean halfDayAllowed,
        boolean attachmentRequired, LeaveBalance balance) {
}
