package com.hrmdemo.dto.attendance;

/** The status of a Đơn bổ sung công; it follows its Yêu cầu phê duyệt. Only APPROVED changes the Công theo ngày. */
public enum AttendanceAdjustmentStatus {
    PENDING, RETURNED, APPROVED, REJECTED, CANCELLED;

    /** Waiting or returned: it blocks a second request for the same day. */
    public boolean open() {
        return this == PENDING || this == RETURNED;
    }
}
