package com.hrmdemo.entity.audit;

/** What happened to an audited record. {@code VIEW}: someone read a record whose reading is itself audited. */
public enum AuditAction {
    CREATE,
    UPDATE,
    DELETE,
    VIEW
}
