package com.hrmdemo.dto.accessscope;

/**
 * Feature permissions. The same names go to the UI ({@code GET /api/me}) to hide menus and buttons,
 * and are checked again in the service layer. The declaration order is the display order, and the
 * permissions of one {@link PermissionGroup} stay together.
 */
public enum Permission {
    /** Read company info. */
    COMPANY_VIEW(PermissionGroup.COMPANY, null),
    /** Edit company info and logo. */
    COMPANY_EDIT(PermissionGroup.COMPANY, COMPANY_VIEW),
    /** Read Accounts; the data scope decides which ones. */
    ACCOUNT_VIEW(PermissionGroup.ACCOUNT, null),
    /** Open the Accounts list and the role matrix. */
    ACCOUNT_LIST(PermissionGroup.ACCOUNT, null),
    /** Create and edit Accounts, set their password, lock and unlock them; edit the permissions of roles. */
    ACCOUNT_EDIT(PermissionGroup.ACCOUNT, ACCOUNT_LIST),
    /** Read the org structure and the org chart. */
    ORG_VIEW(PermissionGroup.ORG, null),
    /** Add, edit, move, deactivate and delete Organization units. */
    ORG_EDIT(PermissionGroup.ORG, ORG_VIEW),
    /** Open the employee list and profiles within the data scope. Everyone reads their own profile without it. */
    EMPLOYEE_VIEW(PermissionGroup.EMPLOYEE, null),
    /** Add Employees; edit their profiles within the data scope. */
    EMPLOYEE_EDIT(PermissionGroup.EMPLOYEE, EMPLOYEE_VIEW),
    /** See the identity numbers (CCCD, MST, BHXH) unmasked; edit them together with {@link #EMPLOYEE_EDIT}. */
    EMPLOYEE_SENSITIVE_VIEW(PermissionGroup.EMPLOYEE, EMPLOYEE_VIEW),
    /** Add, edit, deactivate and delete Danh mục items. Reading the catalogs needs no permission. */
    CATALOG_EDIT(PermissionGroup.CATALOG, null),
    /** Read and change the Luồng phê duyệt of every request type. Approving needs none: the flow decides who. */
    APPROVAL_FLOW_EDIT(PermissionGroup.APPROVAL, null),
    /** Open the project list and every Dự án with its Phân bổ. */
    PROJECT_VIEW(PermissionGroup.PROJECT, null),
    /** Add projects with oneself as PM; edit the projects (and their Phân bổ) one is the PM of. */
    PROJECT_EDIT(PermissionGroup.PROJECT, PROJECT_VIEW),
    /** Quản lý mọi dự án: add projects for any PM, edit every project and its Phân bổ. */
    PROJECT_EDIT_ALL(PermissionGroup.PROJECT, PROJECT_EDIT),
    /** Open Nguồn lực: the heatmap, Bench, Sắp hết dự án and the project dashboard, for every Employee. */
    RESOURCE_VIEW(PermissionGroup.RESOURCE, null),
    /** Change the Ngưỡng nguồn lực (bench, near-full level, weeks before an allocation ends). */
    RESOURCE_EDIT(PermissionGroup.RESOURCE, RESOURCE_VIEW),
    /**
     * Change the Loại nghỉ and their Chính sách phép (entitlement, accrual, advance, carry-over). Sending leave and
     * reading one's own balance need none.
     */
    LEAVE_POLICY_EDIT(PermissionGroup.TIME, null),
    /** Open Ca làm việc and the shift calendar within the data scope. Everyone reads their own shifts without it. */
    SHIFT_VIEW(PermissionGroup.TIME, null),
    /** Add, change, deactivate Ca làm việc and set the Ca mặc định of an Organization unit. */
    SHIFT_EDIT(PermissionGroup.TIME, SHIFT_VIEW),
    /** Phân ca: assign or clear shifts for the Employees within the data scope. */
    SHIFT_ASSIGN(PermissionGroup.TIME, SHIFT_VIEW),
    /** Open the daily attendance (Công theo ngày) within the data scope. Everyone reads their own days without it. */
    ATTENDANCE_VIEW(PermissionGroup.TIME, null),
    /** Import the Log quẹt thẻ (punch files from the machines). */
    ATTENDANCE_IMPORT(PermissionGroup.TIME, ATTENDANCE_VIEW),
    /** Open the Audit log: who changed what and when, with the values before and after. Read-only. */
    AUDIT_VIEW(PermissionGroup.AUDIT, null);

    private final PermissionGroup group;
    private final Permission requires;

    Permission(PermissionGroup group, Permission requires) {
        this.group = group;
        this.requires = requires;
    }

    public PermissionGroup group() {
        return group;
    }

    /** The permission a role must also have to hold this one (an edit needs its view), or null. */
    public Permission requires() {
        return requires;
    }
}
