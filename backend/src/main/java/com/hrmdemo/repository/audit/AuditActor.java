package com.hrmdemo.repository.audit;

import java.util.UUID;

/** An Account that made at least one audited change, with its name as last recorded (null when none was). */
public interface AuditActor {

    UUID getId();

    String getName();
}
