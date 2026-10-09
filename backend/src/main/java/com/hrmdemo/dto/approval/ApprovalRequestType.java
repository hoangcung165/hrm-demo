package com.hrmdemo.dto.approval;

/**
 * The kinds of Yêu cầu phê duyệt (glossary). Each has its own Luồng phê duyệt (approval flow) of 1 to 3 levels.
 * The declaration order is the display order of the flow configuration screen.
 */
public enum ApprovalRequestType {
    /** Cập nhật hồ sơ: an Employee's changes to their own profile, applied when the last level approves. */
    PROFILE_UPDATE,
    /** Nghỉ phép (HRM-18). */
    LEAVE,
    /** Tăng ca (OT) (HRM-25). */
    OVERTIME,
    /** Bổ sung công (HRM-24). */
    ATTENDANCE_ADJUSTMENT,
    /** Timesheet dự án (HRM-27), approved by the PM of the project. */
    TIMESHEET,
    /** Bảng lương (HRM-30): never auto-approved and never delegated. */
    PAYROLL;

    /** Payroll always needs a person at every level: no auto-approve, no Ủy quyền duyệt. */
    public boolean allowsAutoApproveAndDelegation() {
        return this != PAYROLL;
    }
}
