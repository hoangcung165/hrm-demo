package com.hrmdemo.dto.attendance;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** A row of the sender's Đơn bổ sung công, latest first. */
public record AttendanceAdjustmentListItem(UUID id, AttendanceAdjustmentStatus status, LocalDate date,
        @Schema(nullable = true) OffsetDateTime in, @Schema(nullable = true) OffsetDateTime out, boolean canCancel,
        Instant createdAt) {
}
