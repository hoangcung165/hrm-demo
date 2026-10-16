package com.hrmdemo.dto.leave;

import java.math.BigDecimal;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * A request checked without being saved: every day and what it counts, the total, the balance of the type in the
 * year of the first day before the request and Còn lại after it, the problems that stop it, and who would approve it.
 *
 * @param balance        null when the dates themselves are wrong
 * @param remainingAfter Còn lại after this request, for a limited type; null otherwise
 */
public record LeaveCheckResponse(List<LeaveDay> days, BigDecimal total, @Schema(nullable = true) LeaveBalance balance,
        @Schema(nullable = true) BigDecimal remainingAfter, List<LeaveProblem> problems,
        LeaveApproversPreview approvers) {
}
