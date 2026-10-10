package com.hrmdemo.dto.profileupdate;

import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.approval.ApprovalStatus;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The content of a Cập nhật hồ sơ request; the steps, log and actions come from {@code GET /api/approvals/{id}}.
 *
 * @param id      the Yêu cầu phê duyệt's id
 * @param changes in the order of the profile form
 */
public record ProfileUpdateResponse(UUID id, ApprovalStatus status, UUID employeeId,
        @Schema(nullable = true) String note, List<ProfileUpdateChange> changes) {
}
