package com.hrmdemo.dto.audit;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * One Audit log record. {@code before} is null for a CREATE and {@code after} for a DELETE; on an UPDATE both hold
 * only the changed fields. Masked fields hold {@code ***}.
 */
public record AuditLogResponse(UUID id, Instant occurredAt, UUID actorId, String actorName, String action,
        String entityType, String entityLabel, UUID entityId, String summary, Map<String, Object> before,
        Map<String, Object> after) {
}
