package com.hrmdemo.dto.leave;

/**
 * Where a Đơn nghỉ stands. It follows its Yêu cầu phê duyệt, except that an approved request may still be cancelled
 * by its sender before the leave starts, which gives the days back. Pending and returned requests hold their days
 * as Đang chờ; approved ones count as Đã dùng.
 */
public enum LeaveRequestStatus {
    PENDING,
    RETURNED,
    APPROVED,
    REJECTED,
    CANCELLED;

    /** The days are held: waiting, returned to the sender, or approved. */
    public boolean holdsDays() {
        return this == PENDING || this == RETURNED || this == APPROVED;
    }
}
