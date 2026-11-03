package com.hrmdemo.entity.attendance;

import java.time.Instant;
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
 * Lần quẹt: one raw punch of an Employee at an instant. At most one per Employee per instant (unique key), which is
 * what makes importing a file twice safe. Machine punches are written by a native insert that skips what is already
 * there (see {@code PunchImportService}); a mobile punch (HRM-39) is made with {@link #mobile}. A punch is never
 * changed or deleted.
 */
@Entity
@Table(name = "punch")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Punch extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(name = "punched_at", nullable = false, updatable = false)
    private Instant punchedAt;

    /** The machine the punch came from, when the file says. */
    @Column(updatable = false)
    private String device;

    @Column(name = "import_id", updatable = false)
    private UUID importId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private PunchSource source;

    /** Mobile only: the position the phone reported, WGS 84 decimal degrees. */
    @Column(updatable = false)
    private Double latitude;

    @Column(updatable = false)
    private Double longitude;

    /** Mobile only: the accuracy the phone reported, in metres (smaller is better). */
    @Column(name = "accuracy_meters", updatable = false)
    private Double accuracyMeters;

    /** Mobile only: the nearest active Địa điểm chấm công at the moment of the punch; null when there was none. */
    @Column(name = "location_id", updatable = false)
    private UUID locationId;

    @Column(name = "distance_meters", updatable = false)
    private Integer distanceMeters;

    /** Ngoài vùng: farther than the radius of every active Địa điểm chấm công. */
    @Column(name = "outside_location", nullable = false, updatable = false)
    private boolean outsideLocation;

    /** Sai số lớn: the reported accuracy was worse than the company maximum. */
    @Column(name = "low_accuracy", nullable = false, updatable = false)
    private boolean lowAccuracy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** A mobile Lần quẹt at the server's time {@code at}, with what the check-in found. */
    public static Punch mobile(UUID employeeId, Instant at, double latitude, double longitude, double accuracyMeters,
            UUID locationId, Integer distanceMeters, boolean outsideLocation, boolean lowAccuracy) {
        Punch punch = new Punch();
        punch.employeeId = employeeId;
        punch.punchedAt = at;
        punch.source = PunchSource.MOBILE;
        punch.latitude = latitude;
        punch.longitude = longitude;
        punch.accuracyMeters = accuracyMeters;
        punch.locationId = locationId;
        punch.distanceMeters = distanceMeters;
        punch.outsideLocation = outsideLocation;
        punch.lowAccuracy = lowAccuracy;
        punch.createdAt = at;
        punch.updatedAt = at;
        return punch;
    }
}
