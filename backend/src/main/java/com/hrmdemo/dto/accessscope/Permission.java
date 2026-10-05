package com.hrmdemo.dto.accessscope;

/**
 * Feature permissions. The same names go to the UI ({@code GET /api/me}) to hide menus and buttons,
 * and are checked again in the service layer. The declaration order is the display order, and the
 * permissions of one {@link PermissionGroup} stay together.
 */
public enum Permission {
    /** Read company info. */
    COMPANY_VIEW(PermissionGroup.COMPANY),
    /** Edit company info and logo. */
    COMPANY_EDIT(PermissionGroup.COMPANY),
    /** Read Accounts; the data scope decides which ones. */
    ACCOUNT_VIEW(PermissionGroup.ACCOUNT),
    /** Open the Accounts list and the role matrix. */
    ACCOUNT_LIST(PermissionGroup.ACCOUNT),
    /** Create and edit Accounts, set their password, lock and unlock them. */
    ACCOUNT_EDIT(PermissionGroup.ACCOUNT),
    /** Read the org structure and the org chart. */
    ORG_VIEW(PermissionGroup.ORG),
    /** Add, edit, move, deactivate and delete Organization units. */
    ORG_EDIT(PermissionGroup.ORG);

    private final PermissionGroup group;

    Permission(PermissionGroup group) {
        this.group = group;
    }

    public PermissionGroup group() {
        return group;
    }
}
