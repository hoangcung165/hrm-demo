package com.hrmdemo.entity.resource;

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

/** A company's own Ngưỡng nguồn lực, in place of the defaults in code. At most one row per Legal entity. */
@Entity
@Table(name = "resource_setting")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ResourceSetting extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "bench_percent", nullable = false)
    private int benchPercent;

    @Column(name = "near_full_percent", nullable = false)
    private int nearFullPercent;

    @Column(name = "ending_weeks", nullable = false)
    private int endingWeeks;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public ResourceSetting(int benchPercent, int nearFullPercent, int endingWeeks, UUID accountId, Instant at) {
        update(benchPercent, nearFullPercent, endingWeeks, accountId, at);
    }

    public void update(int newBenchPercent, int newNearFullPercent, int newEndingWeeks, UUID accountId, Instant at) {
        benchPercent = newBenchPercent;
        nearFullPercent = newNearFullPercent;
        endingWeeks = newEndingWeeks;
        updatedBy = accountId;
        updatedAt = at;
    }
}
