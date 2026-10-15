package com.hrmdemo.entity.audit;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One Audit log record. Immutable: there is no setter, Hibernate never updates it, and the database refuses UPDATE
 * and DELETE (see the migration). Written only by {@code AuditRecorder}.
 */
@Entity
@Immutable
@Table(name = "audit_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditLog extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "actor_name")
    private String actorName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditAction action;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(nullable = false)
    private String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "before_values")
    private Map<String, Object> beforeValues;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "after_values")
    private Map<String, Object> afterValues;

    public AuditLog(Instant occurredAt, UUID actorId, String actorName, AuditAction action, String entityType,
            UUID entityId, String summary, Map<String, Object> beforeValues, Map<String, Object> afterValues) {
        this.occurredAt = occurredAt;
        this.actorId = actorId;
        this.actorName = actorName;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.summary = summary;
        this.beforeValues = beforeValues;
        this.afterValues = afterValues;
    }
}
