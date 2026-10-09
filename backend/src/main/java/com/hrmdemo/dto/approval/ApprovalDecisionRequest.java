package com.hrmdemo.dto.approval;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

/**
 * The text that goes with an action: an optional note for Duyệt and Gửi lại, the required reason for Từ chối and
 * Trả về để bổ sung ({@code approval.reason_required} when blank).
 */
public record ApprovalDecisionRequest(@Schema(nullable = true) @Size(max = 1000) String comment) {
}
