package com.hrmdemo.dto.audit;

import java.util.UUID;

/** A person who made an audited change, for the person filter of the Audit log; {@code name} is null if unknown. */
public record AuditActorResponse(UUID id, String name) {
}
