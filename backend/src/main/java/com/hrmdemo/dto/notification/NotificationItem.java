package com.hrmdemo.dto.notification;

import java.time.Instant;
import java.util.UUID;

import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One line of the bell, newest first. The row opens the request ({@code requestId}) or the delegations tab.
 *
 * @param actor        who caused it; null for the system (auto-approve)
 * @param onBehalfOf   the approver the actor stood in for under an Ủy quyền duyệt
 * @param requestId    the request, for the APPROVAL_* kinds
 * @param delegationId the delegation, for DELEGATION_RECEIVED
 * @param level        the level it happened at
 */
public record NotificationItem(UUID id, NotificationKind kind, @Schema(nullable = true) EmployeeCard actor,
        @Schema(nullable = true) EmployeeCard onBehalfOf, @Schema(nullable = true) UUID requestId,
        @Schema(nullable = true) ApprovalRequestType requestType, @Schema(nullable = true) String summary,
        @Schema(nullable = true) Integer level, @Schema(nullable = true) UUID delegationId,
        @Schema(nullable = true) String targetPath, Instant createdAt,
        boolean read) {
}
