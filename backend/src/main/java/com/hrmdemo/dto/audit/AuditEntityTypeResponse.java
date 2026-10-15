package com.hrmdemo.dto.audit;

/** A kind of record that is audited, for the filter of the Audit log. */
public record AuditEntityTypeResponse(String key, String label) {
}
