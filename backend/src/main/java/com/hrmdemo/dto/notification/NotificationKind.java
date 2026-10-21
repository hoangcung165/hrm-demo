package com.hrmdemo.dto.notification;

/** What a line of the bell is about; the web app words it (vi/en). */
public enum NotificationKind {
    /** To the approvers (not their delegates): a request reached their level. "{actor} gửi …, chờ bạn duyệt". */
    APPROVAL_WAITING,
    /** To the approvers: a returned request came back. "{actor} đã bổ sung và gửi lại …". */
    APPROVAL_RESUBMITTED,
    /** To the sender: the last level approved; actor null when the system auto-approved it. */
    APPROVAL_APPROVED,
    /** To the sender. */
    APPROVAL_REJECTED,
    /** To the sender: Trả về để bổ sung. */
    APPROVAL_RETURNED,
    /** To the delegate: someone delegated their approvals to them. */
    DELEGATION_RECEIVED,
    /** To the people a Đơn nghỉ copies (CC), when it is sent. "{actor} gửi đơn nghỉ và báo cho bạn". */
    LEAVE_COPIED,
    /** To the approvers of a Đơn nghỉ its sender cancelled after approval. "{actor} đã hủy đơn nghỉ đã duyệt". */
    LEAVE_CANCELLED,
    /** To the PM of a project an Employee is allocated to during their leave. "{actor} xin nghỉ … (thành viên dự án)". */
    LEAVE_PROJECT_MEMBER,
    /** A source record of an Employee reached a configured expiry-warning milestone. */
    EXPIRY_WARNING
}
