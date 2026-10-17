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

/** A signed evaluation remains in the Employee's history after a later outcome. */
@Entity
@Immutable
@Table(name = "probation_evaluation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProbationEvaluation extends LegalEntityOwned {
    public enum Outcome { PASS, FAIL, EXTEND }

    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "employee_id", nullable = false, updatable = false) private UUID employeeId;
    @Column(name = "source_contract_id", nullable = false, updatable = false) private UUID sourceContractId;
    @Column(name = "evaluator_id", nullable = false, updatable = false) private UUID evaluatorId;
    @Column(name = "starts_on", nullable = false, updatable = false) private LocalDate startsOn;
    @Column(name = "ends_on", nullable = false, updatable = false) private LocalDate endsOn;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private Outcome outcome;
    @Column(nullable = false, updatable = false) private String notes;
    @Column(name = "actor_id", nullable = false, updatable = false) private UUID actorId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    public ProbationEvaluation(UUID employeeId, UUID sourceContractId, UUID evaluatorId,
            LocalDate startsOn, LocalDate endsOn, Outcome outcome, String notes, UUID actorId, Instant now) {
        this.employeeId = employeeId;
        this.sourceContractId = sourceContractId;
        this.evaluatorId = evaluatorId;
        this.startsOn = startsOn;
        this.endsOn = endsOn;
        this.outcome = outcome;
        this.notes = notes;
        this.actorId = actorId;
        this.createdAt = now;
    }
}
