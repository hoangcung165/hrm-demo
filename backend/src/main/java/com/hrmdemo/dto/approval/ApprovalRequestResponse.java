package com.hrmdemo.dto.approval;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * A Yêu cầu phê duyệt as its detail page shows it. The type's own content (the changed fields…) comes from the
 * type's endpoint.
 *
 * @param level            the waiting level, or the one that returned or ended it, from 1
 * @param autoApproveDueAt when the waiting level approves itself; null when never or not waiting
 */
public record ApprovalRequestResponse(UUID id, ApprovalRequestType type, ApprovalStatus status, int level,
        int levelCount, String summary, EmployeeCard sender, Instant sentAt,
        @Schema(nullable = true) Instant autoApproveDueAt, List<ApprovalStepResponse> steps,
        List<ApprovalLogEntryResponse> log, ApprovalAllowedActions allowed) {
}
