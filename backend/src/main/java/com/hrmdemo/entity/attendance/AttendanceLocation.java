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
 * Địa điểm chấm công: a named place of the company where a mobile Lần quẹt is expected, with a radius in metres
 * (50 to 1,000). Never deleted: a place no longer used is made inactive. Changing one never changes stored punches.
 */
@Entity
@Table(name = "attendance_location")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AttendanceLocation extends LegalEntityOwned {

    public static final int MIN_RADIUS_METERS = 50;
    public static final int MAX_RADIUS_METERS = 1000;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String address;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(name = "radius_meters", nullable = false)
    private int radiusMeters;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public AttendanceLocation(String name, String address, double latitude, double longitude, int radiusMeters,
            Instant now) {
        this.active = true;
        this.createdAt = now;
        update(name, address, latitude, longitude, radiusMeters, now);
    }

    public void update(String newName, String newAddress, double newLatitude, double newLongitude, int newRadius,
            Instant now) {
        name = newName;
        address = newAddress;
        latitude = newLatitude;
        longitude = newLongitude;
        radiusMeters = newRadius;
        updatedAt = now;
    }

    public void setActive(boolean newActive, Instant now) {
        if (active != newActive) {
            active = newActive;
            updatedAt = now;
        }
    }
}
