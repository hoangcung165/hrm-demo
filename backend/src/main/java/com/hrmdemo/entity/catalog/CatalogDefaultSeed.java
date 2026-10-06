package com.hrmdemo.entity.catalog;

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

/**
 * A set of catalog defaults the company has received, e.g. {@code positions} or {@code holidays-2026}. Each set
 * is seeded once, so a default the company deleted does not come back.
 */
@Entity
@Table(name = "catalog_default_seed")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CatalogDefaultSeed extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "seed_set", nullable = false, updatable = false)
    private String seedSet;

    @Column(name = "seeded_at", nullable = false, updatable = false)
    private Instant seededAt;

    public CatalogDefaultSeed(String seedSet, Instant seededAt) {
        this.seedSet = seedSet;
        this.seededAt = seededAt;
    }
}
