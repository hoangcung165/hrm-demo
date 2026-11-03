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

/**
 * An Employee's acceptance of the notice on location and photo for mobile check-in (Decree 13/2023), one row per
 * Employee. Withdrawing keeps the row and its date; accepting again starts a new acceptance date.
 */
@Entity
@Table(name = "mobile_checkin_consent")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MobileCheckinConsent extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    /** Which wording of the notice was accepted. */
    @Column(name = "notice_version", nullable = false)
    private int noticeVersion;

    @Column(name = "accepted_at", nullable = false)
    private Instant acceptedAt;

    @Column(name = "withdrawn_at")
    private Instant withdrawnAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public MobileCheckinConsent(UUID employeeId, int noticeVersion, Instant now) {
        this.employeeId = employeeId;
        accept(noticeVersion, now);
    }

    /** In force: accepted and not withdrawn since. */
    public boolean isAccepted() {
        return withdrawnAt == null;
    }

    public void accept(int version, Instant now) {
        noticeVersion = version;
        acceptedAt = now;
        withdrawnAt = null;
        updatedAt = now;
    }

    public void withdraw(Instant now) {
        withdrawnAt = now;
        updatedAt = now;
    }
}
