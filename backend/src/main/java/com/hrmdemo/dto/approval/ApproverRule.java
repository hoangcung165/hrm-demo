package com.hrmdemo.dto.approval;

/** How the approvers of one level of a Luồng phê duyệt are found. */
public enum ApproverRule {
    /** The Quản lý trực tiếp of the sender (glossary, people context). */
    LINE_MANAGER,
    /** The PM of the request's Dự án. Only for {@link ApprovalRequestType#TIMESHEET}. */
    PROJECT_MANAGER,
    /** Any Employee whose Account has the level's role, the sender excluded. One of them is enough. */
    ROLE
}
