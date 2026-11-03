package com.hrmdemo.entity.attendance;

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

/** A company's own rules of mobile check-in, in place of the defaults in code. At most one row per Legal entity. */
@Entity
@Table(name = "mobile_checkin_setting")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MobileCheckinSetting extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "max_accuracy_meters", nullable = false)
    private int maxAccuracyMeters;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public MobileCheckinSetting(int maxAccuracyMeters, UUID accountId, Instant at) {
        update(maxAccuracyMeters, accountId, at);
    }

    public void update(int newMaxAccuracyMeters, UUID accountId, Instant at) {
        maxAccuracyMeters = newMaxAccuracyMeters;
        updatedBy = accountId;
        updatedAt = at;
    }
}
