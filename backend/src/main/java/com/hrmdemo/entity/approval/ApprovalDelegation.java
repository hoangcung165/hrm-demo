package com.hrmdemo.entity.approval;

import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** One Ủy quyền duyệt: the delegator's approvals of some request types go to the delegate for a range of days. */
@Entity
@Table(name = "approval_delegation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApprovalDelegation extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "delegator_id", nullable = false, updatable = false)
    private UUID delegatorId;

    @Column(name = "delegate_id", nullable = false, updatable = false)
    private UUID delegateId;

    @Column(name = "start_date", nullable = false, updatable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false, updatable = false)
    private LocalDate endDate;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "approval_delegation_type", joinColumns = @JoinColumn(name = "delegation_id"))
    @Column(name = "request_type", nullable = false)
    private Set<String> requestTypes = new LinkedHashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    public ApprovalDelegation(UUID delegatorId, UUID delegateId, LocalDate startDate, LocalDate endDate,
            Set<String> requestTypes, Instant createdAt) {
        this.delegatorId = delegatorId;
        this.delegateId = delegateId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.requestTypes.addAll(requestTypes);
        this.createdAt = createdAt;
    }

    /** Whether it covers the day: within the range and not ended early. */
    public boolean coversDate(LocalDate date) {
        return endedAt == null && !date.isBefore(startDate) && !date.isAfter(endDate);
    }

    public void endEarly(Instant at) {
        this.endedAt = at;
    }
}
