package com.hrmdemo.dto.approval;

/** Where one level of a request stands, for the "Các bước duyệt" list. */
public enum ApprovalStepState {
    /** Approved, by a person or by the system. */
    DONE,
    /** Waiting for its approvers now. */
    WAITING,
    /** It returned the request; it waits again when the sender resubmits. */
    RETURNED,
    /** The request was rejected here. */
    REJECTED,
    /** The sender cancelled while this level was current. */
    CANCELLED,
    /** Not reached (yet, or ever). */
    NOT_REACHED
}
