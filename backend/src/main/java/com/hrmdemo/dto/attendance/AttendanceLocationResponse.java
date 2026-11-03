package com.hrmdemo.dto.attendance;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * A Địa điểm chấm công. An inactive one is kept for the punches made there but no longer counts for new ones.
 *
 * @param punchesLast30Days mobile Lần quẹt of the last 30 days whose nearest place this was (inside or not)
 */
public record AttendanceLocationResponse(UUID id, String name, @Schema(nullable = true) String address,
        double latitude, double longitude, int radiusMeters, boolean active, long punchesLast30Days,
        Instant createdAt, Instant updatedAt) {
}
