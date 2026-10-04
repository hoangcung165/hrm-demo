package com.hrmdemo.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.hibernate.annotations.TenantId;

/**
 * Base class of every root entity (ADR 0003): the row belongs to one Pháp nhân (Legal entity).
 * Hibernate fills {@code legal_entity_id} on insert and adds it to every query and load by id,
 * so no repository or service filters by Legal entity by hand. The current Legal entity comes from
 * {@code CurrentLegalEntity}. Native SQL is not filtered: avoid it on root tables.
 */
@MappedSuperclass
@Getter
public abstract class LegalEntityOwned {

    @TenantId
    @Column(name = "legal_entity_id", nullable = false, updatable = false)
    private UUID legalEntityId;
}
