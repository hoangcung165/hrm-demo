package com.hrmdemo.dto.approval;

import java.time.Instant;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One row of the Hộp thư duyệt.
 *
 * @param rule        the rule of the current level ("Cấp 2/2 · HR")
 * @param role        its role for a ROLE level
 * @param onBehalfOf  WAITING only: the approver the caller would stand in for ("Duyệt thay …"); null otherwise
 * @param resubmitted whether the sender sent it again after a return ("Đã bổ sung, gửi lại")
 */
public record ApprovalInboxItem(UUID id, ApprovalRequestType type, ApprovalStatus status, int level,
        int levelCount, ApproverRule rule, @Schema(nullable = true) String role, String summary,
        EmployeeCard sender, Instant sentAt, @Schema(nullable = true) Instant autoApproveDueAt,
        @Schema(nullable = true) EmployeeCard onBehalfOf, boolean resubmitted, Instant updatedAt) {
}
