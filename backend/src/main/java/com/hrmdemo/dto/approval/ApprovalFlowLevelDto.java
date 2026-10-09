package com.hrmdemo.dto.approval;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/**
 * One level of a Luồng phê duyệt, as the API reads and writes it.
 *
 * @param rule how the approvers are found
 * @param role for {@code ROLE}: the role name ({@code HR}, {@code ACCOUNTANT}, {@code DIRECTOR}…); null otherwise
 */
public record ApprovalFlowLevelDto(
        @NotNull ApproverRule rule,
        @Schema(nullable = true, example = "HR") String role) {
}
