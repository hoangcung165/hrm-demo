package com.hrmdemo.dto.approval;

import java.time.Instant;
import java.util.List;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One level of the request.
 *
 * @param approvers   who may approve it now (WAITING only)
 * @param escalated   whether it went up past its own rule (Tự đẩy lên cấp trên)
 * @param decidedBy   who approved, rejected or returned it; null when the system auto-approved it or nobody did
 * @param onBehalfOf  the approver {@code decidedBy} stood in for under an Ủy quyền duyệt
 * @param autoApproved whether the system approved it after the flow's days
 */
public record ApprovalStepResponse(int level, ApproverRule rule, @Schema(nullable = true) String role,
        ApprovalStepState state, List<EmployeeCard> approvers, boolean escalated,
        @Schema(nullable = true) EmployeeCard decidedBy, @Schema(nullable = true) EmployeeCard onBehalfOf,
        @Schema(nullable = true) Instant decidedAt, @Schema(nullable = true) String comment,
        boolean autoApproved) {
}
