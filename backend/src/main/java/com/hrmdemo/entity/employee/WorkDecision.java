package com.hrmdemo.entity.employee;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

/** Signed decision: a source document and an immutable milestone in the Employee's working history. */
@Entity
@Immutable
@Table(name = "work_decision")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkDecision extends LegalEntityOwned {
    public enum Kind { TRANSFER, PROMOTION, REWARD, DISCIPLINE }

    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "employee_id", nullable = false, updatable = false) private UUID employeeId;
    @Column(name = "decision_number", nullable = false, updatable = false) private String decisionNumber;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private Kind kind;
    @Column(name = "signed_on", nullable = false, updatable = false) private LocalDate signedOn;
    @Column(name = "effective_on", nullable = false, updatable = false) private LocalDate effectiveOn;
    @Column(nullable = false, updatable = false) private String description;
    @Column(name = "previous_org_unit_id", updatable = false) private UUID previousOrgUnitId;
    @Column(name = "org_unit_id", updatable = false) private UUID orgUnitId;
    @Column(name = "previous_position_id", nullable = false, updatable = false) private UUID previousPositionId;
    @Column(name = "position_id", nullable = false, updatable = false) private UUID positionId;
    @Column(name = "actor_id", nullable = false, updatable = false) private UUID actorId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    public WorkDecision(UUID employeeId, String number, Kind kind, LocalDate signedOn, LocalDate effectiveOn,
            String description, UUID previousUnit, UUID unit, UUID previousPosition, UUID position,
            UUID actorId, Instant now) {
        this.employeeId = employeeId;
        this.decisionNumber = number;
        this.kind = kind;
        this.signedOn = signedOn;
        this.effectiveOn = effectiveOn;
        this.description = description;
        this.previousOrgUnitId = previousUnit;
        this.orgUnitId = unit;
        this.previousPositionId = previousPosition;
        this.positionId = position;
        this.actorId = actorId;
        this.createdAt = now;
    }
}
