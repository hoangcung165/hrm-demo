package com.hrmdemo.entity.notification;

import java.time.Instant;
import java.util.UUID;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** One line of an Employee's bell. Everything but the read time is fixed when it is written. */
@Entity
@Table(name = "notification")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "recipient_id", nullable = false, updatable = false)
    private UUID recipientId;

    @Column(nullable = false, updatable = false)
    private String kind;

    @Column(name = "request_id", updatable = false)
    private UUID requestId;

    @Column(name = "delegation_id", updatable = false)
    private UUID delegationId;

    @Column(name = "actor_id", updatable = false)
    private UUID actorId;

    @Column(name = "on_behalf_of_id", updatable = false)
    private UUID onBehalfOfId;

    @Column(name = "request_type", updatable = false)
    private String requestType;

    @Column(updatable = false)
    private String summary;

    @Column(updatable = false)
    private Integer level;

    @Column(name = "target_path", updatable = false)
    private String targetPath;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "read_at")
    private Instant readAt;

    public Notification(UUID recipientId, String kind, UUID requestId, UUID delegationId, UUID actorId,
            UUID onBehalfOfId, String requestType, String summary, Integer level, Instant createdAt) {
        this.recipientId = recipientId;
        this.kind = kind;
        this.requestId = requestId;
        this.delegationId = delegationId;
        this.actorId = actorId;
        this.onBehalfOfId = onBehalfOfId;
        this.requestType = requestType;
        this.summary = summary;
        this.level = level;
        this.createdAt = createdAt;
    }

    public static Notification expiry(UUID recipientId, String summary, String targetPath, Instant at) {
        Notification notification = new Notification(recipientId, "EXPIRY_WARNING", null, null, null, null,
                null, summary, null, at);
        notification.targetPath = targetPath;
        return notification;
    }

    public void markRead(Instant at) {
        if (readAt == null) {
            readAt = at;
        }
    }
}
