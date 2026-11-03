package com.hrmdemo.dto.attendance;

import java.time.LocalDate;
import java.util.List;

import com.hrmdemo.dto.attendance.DailyAttendanceResponse.Day;
import com.hrmdemo.dto.leave.LeaveApproversPreview;
import com.hrmdemo.dto.shift.ShiftCalendarResponse.ShiftBrief;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * What the form needs for one of the sender's days: the day as it is now, which side(s) may be filled, who approves,
 * and what stops a request.
 *
 * @param day the Công theo ngày now, or null when the day has neither a shift nor a punch
 * @param shift the day's Ca làm việc, or null
 * @param inMissing the day has no In: the request may give one
 * @param outMissing the day has no Out: the request may give one
 * @param problems codes of what stops any request for this day (no_shift, future, too_old, manual_entry,
 *        already_open, nothing_missing); empty when a request can be sent
 */
public record AttendanceAdjustmentCheck(LocalDate date, @Schema(nullable = true) Day day,
        @Schema(nullable = true) ShiftBrief shift, boolean inMissing, boolean outMissing, List<String> problems,
        LeaveApproversPreview approvers) {
}
