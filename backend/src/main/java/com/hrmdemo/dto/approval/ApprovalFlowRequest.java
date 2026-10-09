package com.hrmdemo.dto.approval;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * The whole flow of one request type, as saved from the configuration screen.
 *
 * @param levels            1 to 3 levels, in order
 * @param autoApproveDays   1 to 30, or null for never; must be null for payroll
 * @param delegationAllowed whether Ủy quyền duyệt applies; must be false for payroll
 */
public record ApprovalFlowRequest(
        @NotNull List<@Valid @NotNull ApprovalFlowLevelDto> levels,
        @Schema(nullable = true, example = "3") Integer autoApproveDays,
        boolean delegationAllowed) {
}
