package com.hrmdemo.entity.approval;

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

/** One line of the Nhật ký of a Yêu cầu phê duyệt: one approval event, numbered in order within the request. */
@Entity
@Table(name = "approval_request_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalRequestLogEntry extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "request_id", nullable = false, updatable = false)
    private UUID requestId;

    @Column(nullable = false, updatable = false)
    private String event;

    @Column(nullable = false, updatable = false)
    private int level;

    @Column(name = "actor_id", updatable = false)
    private UUID actorId;

    @Column(name = "on_behalf_of_id", updatable = false)
    private UUID onBehalfOfId;

    @Column(updatable = false)
    private String comment;

    @Column(name = "escalated_to", updatable = false)
    private String escalatedTo;

    @Column(nullable = false, updatable = false)
    private Instant at;

    @Column(nullable = false, updatable = false)
    private int seq;

    public ApprovalRequestLogEntry(UUID requestId, String event, int level, UUID actorId, UUID onBehalfOfId,
            String comment, String escalatedTo, Instant at, int seq) {
        this.requestId = requestId;
        this.event = event;
        this.level = level;
        this.actorId = actorId;
        this.onBehalfOfId = onBehalfOfId;
        this.comment = comment;
        this.escalatedTo = escalatedTo;
        this.at = at;
        this.seq = seq;
    }
}
