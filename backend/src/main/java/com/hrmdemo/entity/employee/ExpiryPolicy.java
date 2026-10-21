package com.hrmdemo.entity.employee;

import com.hrmdemo.dto.employee.ExpiryType;
import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** One persisted warning window per source type in the company. */
@Entity
@Table(name = "expiry_policy")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExpiryPolicy extends LegalEntityOwned {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Enumerated(EnumType.STRING) @Column(name = "document_type", nullable = false)
    private ExpiryType documentType;
    @Column(name = "advance_days", nullable = false) private int advanceDays;
    @Column(name = "updated_by") private UUID updatedBy;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public ExpiryPolicy(ExpiryType type, int days, Instant now) {
        documentType = type;
        update(days, null, now);
    }

    public void update(int days, UUID actor, Instant now) {
        advanceDays = days;
        updatedBy = actor;
        updatedAt = now;
    }
}
