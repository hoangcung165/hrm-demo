package com.hrmdemo.dto.audit;

import java.time.Instant;
import java.util.UUID;

/** One row of the Audit log list; the values before and after come with the single record. */
public record AuditLogListItem(UUID id, Instant occurredAt, UUID actorId, String actorName, String action,
        String entityType, String entityLabel, UUID entityId, String summary) {
}
