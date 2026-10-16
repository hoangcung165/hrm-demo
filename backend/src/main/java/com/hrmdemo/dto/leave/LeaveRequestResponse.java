package com.hrmdemo.dto.leave;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.approval.ApprovalRequestResponse;
import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * A Đơn nghỉ as its sender, its approvers and the people it copies see it.
 *
 * @param approval        the Yêu cầu phê duyệt with its steps and log; null for a person who is only copied
 * @param balance         the sender's balance of the type in the year of the first day, now; null for a person who is
 *                        only copied
 * @param remainingBefore Còn lại without this request, while it holds days (limited types); null otherwise
 * @param remainingAfter  Còn lại with it; null otherwise
 * @param unitAbsences    others of the sender's unit off on some of these days; empty for a person who is only
 *                        copied
 * @param canEdit         the sender may change it and send it again (returned to them)
 * @param canCancel       the sender may cancel it: waiting, returned, or approved and not started yet
 */
public record LeaveRequestResponse(UUID id, LeaveRequestStatus status, EmployeeCard employee, LeaveTypeRef leaveType,
        LocalDate startDate, DayPart startPart, LocalDate endDate, DayPart endPart, BigDecimal days,
        List<LeaveDay> dayList, @Schema(nullable = true) String reason, List<EmployeeCard> cc,
        List<LeaveAttachmentSummary> attachments, @Schema(nullable = true) ApprovalRequestResponse approval,
        @Schema(nullable = true) LeaveBalance balance, @Schema(nullable = true) BigDecimal remainingBefore,
        @Schema(nullable = true) BigDecimal remainingAfter, List<LeaveAbsence> unitAbsences, boolean canEdit,
        boolean canCancel, Instant createdAt, Instant updatedAt, @Schema(nullable = true) Instant cancelledAt) {
}
