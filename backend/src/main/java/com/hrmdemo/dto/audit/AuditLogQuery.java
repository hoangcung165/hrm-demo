package com.hrmdemo.dto.audit;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Filters of the Audit log list. All optional; they apply together.
 *
 * @param from first day, in the company's time, inclusive
 * @param to   last day, in the company's time, inclusive
 * @param q    part of the summary or of the name of the person, case does not matter
 */
public record AuditLogQuery(int page, int size, String entityType, UUID entityId, UUID actorId, LocalDate from,
        LocalDate to, String q) {
}
