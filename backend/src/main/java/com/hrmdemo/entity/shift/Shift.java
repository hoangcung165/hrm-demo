package com.hrmdemo.entity.shift;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Ca làm việc. An end time at or before the start time means the shift crosses midnight; it belongs to the day it
 * starts. Never deleted: a shift no one should use any more is deactivated.
 */
@Entity
@Table(name = "shift")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Shift extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, updatable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "break_start")
    private LocalTime breakStart;

    @Column(name = "break_end")
    private LocalTime breakEnd;

    @Column(name = "late_tolerance_minutes", nullable = false)
    private int lateToleranceMinutes;

    @Column(name = "early_tolerance_minutes", nullable = false)
    private int earlyToleranceMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "rounding_mode", nullable = false)
    private RoundingMode roundingMode;

    @Column(name = "rounding_minutes")
    private Integer roundingMinutes;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Shift(String code, ShiftPattern pattern, Instant now) {
        this.code = code;
        this.active = true;
        this.createdAt = now;
        apply(pattern, now);
    }

    /** Replaces everything but the code. */
    public void update(ShiftPattern pattern, Instant now) {
        apply(pattern, now);
    }

    public void setActive(boolean newActive, Instant now) {
        if (active != newActive) {
            active = newActive;
            updatedAt = now;
        }
    }

    public ShiftPattern pattern() {
        return new ShiftPattern(name, startTime, endTime, breakStart, breakEnd, lateToleranceMinutes,
                earlyToleranceMinutes, roundingMode, roundingMinutes);
    }

    private void apply(ShiftPattern pattern, Instant now) {
        name = pattern.name();
        startTime = pattern.startTime();
        endTime = pattern.endTime();
        breakStart = pattern.breakStart();
        breakEnd = pattern.breakEnd();
        lateToleranceMinutes = pattern.lateToleranceMinutes();
        earlyToleranceMinutes = pattern.earlyToleranceMinutes();
        roundingMode = pattern.roundingMode();
        roundingMinutes = pattern.roundingMinutes();
        updatedAt = now;
    }
}
