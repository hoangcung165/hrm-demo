package com.hrmdemo.dto.attendance;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.hrmdemo.dto.approval.ApprovalRequestResponse;
import com.hrmdemo.dto.attendance.DailyAttendanceResponse.Day;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.shift.ShiftCalendarResponse.ShiftBrief;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One Đơn bổ sung công, for its sender and the people its approval request lets in.
 *
 * @param in the In it gives, or null
 * @param out the Out it gives, or null
 * @param dayNow the Công theo ngày now (with this request counted only once it is approved)
 * @param dayAfter the day as it would be with this request approved
 * @param approval the approval steps, null for someone who may not see them
 * @param canEdit the caller is the sender and the request was returned to them
 * @param canCancel the caller is the sender and the request still waits or was returned
 */
public record AttendanceAdjustmentResponse(java.util.UUID id, AttendanceAdjustmentStatus status, EmployeeCard employee,
        LocalDate date, @Schema(nullable = true) ShiftBrief shift, @Schema(nullable = true) OffsetDateTime in,
        @Schema(nullable = true) OffsetDateTime out, String reason, @Schema(nullable = true) Day dayNow,
        @Schema(nullable = true) Day dayAfter, @Schema(nullable = true) ApprovalRequestResponse approval,
        boolean canEdit, boolean canCancel, Instant createdAt, Instant updatedAt) {
}
