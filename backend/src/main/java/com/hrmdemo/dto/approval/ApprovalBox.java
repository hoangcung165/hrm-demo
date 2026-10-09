package com.hrmdemo.dto.approval;

/** The tabs of the Hộp thư duyệt. */
public enum ApprovalBox {
    /** Chờ tôi duyệt: waiting at a level the caller approves (also on behalf of someone who delegated). */
    WAITING,
    /** Tôi đã gửi: sent by the caller, whatever their status. */
    SENT,
    /** Đã xử lý: the caller approved, rejected or returned them at some level. */
    HANDLED
}
