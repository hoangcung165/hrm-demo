package com.hrmdemo.dto.accessscope;

/**
 * Whose records an Account may see, from narrowest to widest (the order matters: several roles take the widest).
 * Scope by managed Project comes with HRM-15, as a set of projects next to this level, not as another level.
 */
public enum DataScope {
    /** Only the Account's own records. */
    SELF,
    /** Also the records of the Organization units the Account's Employee heads, and of every unit below them. */
    ORG_UNIT,
    /** Every record of the Legal entity. */
    COMPANY
}
