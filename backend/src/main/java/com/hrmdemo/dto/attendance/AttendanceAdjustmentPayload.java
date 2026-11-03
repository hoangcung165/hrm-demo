package com.hrmdemo.dto.attendance;

import java.time.LocalDate;
import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * A Đơn bổ sung công as the sender fills it in.
 *
 * @param date one of the sender's own days with a Ca làm việc, not after today and at most 30 days back
 * @param in the forgotten In, only when the day has no In; on a shift that crosses midnight a time before the shift's
 *        start is on the next calendar day
 * @param out the forgotten Out, only when the day has no Out; same rule
 * @param reason up to 500 characters
 */
public record AttendanceAdjustmentPayload(LocalDate date,
        @Schema(nullable = true, type = "string", example = "08:00") @JsonFormat(pattern = "HH:mm") LocalTime in,
        @Schema(nullable = true, type = "string", example = "17:00") @JsonFormat(pattern = "HH:mm") LocalTime out,
        String reason) {
}
