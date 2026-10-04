package com.hrmdemo.dto.accessscope;

/**
 * Feature permissions. The same names go to the UI ({@code GET /api/me}) to hide menus and buttons,
 * and are checked again in the service layer.
 */
public enum Permission {
    /** Read company info. */
    COMPANY_VIEW,
    /** Edit company info and logo. */
    COMPANY_EDIT,
    /** Read Accounts; the data scope decides which ones. */
    ACCOUNT_VIEW
}
