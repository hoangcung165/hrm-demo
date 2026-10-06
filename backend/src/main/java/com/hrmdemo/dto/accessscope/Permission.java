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
    CATALOG_EDIT(PermissionGroup.CATALOG, null);

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
