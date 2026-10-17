package com.hrmdemo.entity.employee;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/** A signed-off departure milestone; the Employee record remains available. */
@Entity
@Immutable
@Table(name = "resignation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Resignation extends LegalEntityOwned {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "employee_id", nullable = false, updatable = false) private UUID employeeId;
    @Column(name = "last_working_day", nullable = false, updatable = false) private LocalDate lastWorkingDay;
    @Column(nullable = false, updatable = false, length = 1000) private String reason;
    @Column(name = "actor_id", nullable = false, updatable = false) private UUID actorId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    public Resignation(UUID employeeId, LocalDate lastWorkingDay, String reason, UUID actorId, Instant now) {
        this.employeeId = employeeId;
        this.lastWorkingDay = lastWorkingDay;
        this.reason = reason;
        this.actorId = actorId;
        this.createdAt = now;
    }
}
