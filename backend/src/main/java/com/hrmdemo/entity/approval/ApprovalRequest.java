package com.hrmdemo.entity.approval;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ListIndexBase;

/**
 * A Yêu cầu phê duyệt between two actions of the approval engine. Names (type, status, rule, role) are stored as
 * text; the service maps them to the engine's types. {@link #version} turns two approvers acting at once into a
 * conflict instead of a double approval.
 */
@Entity
@Table(name = "approval_request")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalRequest extends LegalEntityOwned {

    @Id
    private UUID id;

    @Column(name = "request_type", nullable = false, updatable = false)
    private String requestType;

    @Column(name = "sender_id", nullable = false, updatable = false)
    private UUID senderId;

    @Column(name = "project_id", updatable = false)
    private UUID projectId;

    @Column(nullable = false)
    private String summary;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "approval_request_level", joinColumns = @JoinColumn(name = "request_id"))
    @OrderColumn(name = "position", nullable = false)
    @ListIndexBase(1)
    private List<ApprovalFlowSetting.Level> levels = new ArrayList<>();

    @Column(name = "auto_approve_days", updatable = false)
    private Integer autoApproveDays;

    @Column(name = "delegation_allowed", nullable = false, updatable = false)
    private boolean delegationAllowed;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private int level;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "approval_request_approver", joinColumns = @JoinColumn(name = "request_id"))
    @Column(name = "employee_id", nullable = false)
    private Set<UUID> approvers = new LinkedHashSet<>();

    @Column(nullable = false)
    private boolean escalated;

    @Column(name = "level_reached_at", nullable = false)
    private Instant levelReachedAt;

    @Column(name = "waited_seconds", nullable = false)
    private long waitedSeconds;

    @Column(name = "auto_approve_due_at")
    private Instant autoApproveDueAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    public ApprovalRequest(UUID id, String requestType, UUID senderId, UUID projectId, String summary,
            List<ApprovalFlowSetting.Level> levels, Integer autoApproveDays, boolean delegationAllowed,
            Instant createdAt) {
        this.id = id;
        this.requestType = requestType;
        this.senderId = senderId;
        this.projectId = projectId;
        this.summary = summary;
        this.levels.addAll(levels);
        this.autoApproveDays = autoApproveDays;
        this.delegationAllowed = delegationAllowed;
        this.createdAt = createdAt;
    }

    /** Copies the engine's state after an action. */
    public void apply(String newStatus, int newLevel, Set<UUID> newApprovers, boolean newEscalated,
            Instant newLevelReachedAt, long newWaitedSeconds, Instant newAutoApproveDueAt, Instant at) {
        status = newStatus;
        level = newLevel;
        approvers.clear();
        approvers.addAll(newApprovers);
        escalated = newEscalated;
        levelReachedAt = newLevelReachedAt;
        waitedSeconds = newWaitedSeconds;
        autoApproveDueAt = newAutoApproveDueAt;
        updatedAt = at;
    }
}
