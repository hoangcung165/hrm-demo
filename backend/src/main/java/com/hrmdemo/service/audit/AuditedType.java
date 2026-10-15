package com.hrmdemo.service.audit;

import java.util.List;

/**
 * How one kind of record is audited: the audited fields, and which of them are masked. Registering a new kind is a
 * configuration entry in {@link AuditRegistrations}, not new recording code.
 *
 * @param key    stable name stored with every record, upper snake case ({@code RESOURCE_SETTING})
 * @param label  English name for the screens and summaries ("Resource thresholds")
 * @param fields the fields whose values are kept, in display order; any other field passed in is dropped
 */
public record AuditedType(String key, String label, List<Field> fields) {

    /** An audited field. A masked field is recorded as changed but its value is stored as {@link #MASK}. */
    public record Field(String name, boolean masked) {
    }

    /** What is stored instead of the value of a masked field (identity numbers, bank accounts, passwords). */
    public static final String MASK = "***";

    public AuditedType {
        if (key == null || !key.matches("[A-Z][A-Z0-9_]*")) {
            throw new IllegalArgumentException("Audited type key must be UPPER_SNAKE_CASE: " + key);
        }
        fields = List.copyOf(fields);
        if (fields.isEmpty()) {
            throw new IllegalArgumentException("Audited type " + key + " needs at least one field");
        }
    }

    public static Field field(String name) {
        return new Field(name, false);
    }

    public static Field masked(String name) {
        return new Field(name, true);
    }
}
