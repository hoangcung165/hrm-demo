package com.hrmdemo.dto.accessscope;

/**
 * Whose records an Account may see, from narrowest to widest (the order matters: several roles take the widest).
 * HRM-04 adds a scope between the two for managed Organization units and Projects.
 */
public enum DataScope {
    /** Only the Account's own records. */
    SELF,
    /** Every record of the Legal entity. */
    COMPANY
}
