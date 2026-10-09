package com.hrmdemo.dto.approval;

/**
 * Where a Yêu cầu phê duyệt stands: {@code DRAFT → PENDING (level n) → APPROVED | REJECTED | RETURNED_FOR_INFO |
 * CANCELLED}. {@code RETURNED_FOR_INFO} is not final: the sender resubmits and the request continues at the level
 * that returned it. The other three after {@code PENDING} are final.
 */
public enum ApprovalStatus {
    /** Being written by the sender, not sent yet. */
    DRAFT,
    /** Waiting for an approver of the current level. */
    PENDING,
    /** Đã duyệt: the last level approved. */
    APPROVED,
    /** Bị từ chối: ended at some level; sending again means a new request from level 1. */
    REJECTED,
    /** Trả về để bổ sung: waiting for the sender to complete it and resubmit. */
    RETURNED_FOR_INFO,
    /** Đã hủy by the sender. */
    CANCELLED;

    public boolean isFinal() {
        return this == APPROVED || this == REJECTED || this == CANCELLED;
    }
}
