package com.hrmdemo.dto.attendance;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** A Địa điểm chấm công. An inactive one is kept for the punches made there but no longer counts for new ones. */
public record AttendanceLocationResponse(UUID id, String name, @Schema(nullable = true) String address,
        double latitude, double longitude, int radiusMeters, boolean active, Instant createdAt, Instant updatedAt) {
}
