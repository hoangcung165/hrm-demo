package com.hrmdemo.dto.approval;

import java.time.Instant;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The flow in force for one request type.
 *
 * @param requestType           the request type
 * @param levels                1 to 3 levels, in order
 * @param autoApproveDays       days before a waiting level approves itself, or null for never
 * @param delegationAllowed     whether Ủy quyền duyệt applies
 * @param automationAllowed     false for payroll: the screen locks auto-approve and delegation
 * @param customized            whether the company changed the default
 * @param updatedAt             when the company last saved it; null for the default
 */
public record ApprovalFlowResponse(
        ApprovalRequestType requestType,
        List<ApprovalFlowLevelDto> levels,
        @Schema(nullable = true) Integer autoApproveDays,
        boolean delegationAllowed,
        boolean automationAllowed,
        boolean customized,
        @Schema(nullable = true) Instant updatedAt) {
}
