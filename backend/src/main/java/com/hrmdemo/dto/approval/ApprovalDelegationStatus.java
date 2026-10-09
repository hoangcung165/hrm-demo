package com.hrmdemo.dto.approval;

/** Where an Ủy quyền duyệt stands today. */
public enum ApprovalDelegationStatus {
    /** Sắp tới: starts on a later day; it can still be cancelled. */
    UPCOMING,
    /** Đang hiệu lực: covers today; it can be ended early. */
    ACTIVE,
    /** Đã kết thúc: past its last day, or ended early. */
    ENDED
}
