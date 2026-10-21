package com.hrmdemo.dto.shift;

import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * A Ca làm việc to add or save. Times are "HH:mm"; an end at or before the start crosses midnight.
 *
 * @param code 1 to 20 letters, digits, '-' or '_', unique (case ignored); read when adding only, never changed
 * @param name 1 to 100 characters
 * @param breakStart with {@code breakEnd}: both or neither, inside the shift
 * @param lateToleranceMinutes 0 to 120
 * @param earlyToleranceMinutes 0 to 120
 * @param roundingMode NONE, UP, DOWN or NEAREST
 * @param roundingMinutes 5, 10, 15 or 30 with a rounding mode other than NONE; left out for NONE
 */
public record ShiftRequest(String code, String name,
        @JsonFormat(pattern = "HH:mm") LocalTime startTime, @JsonFormat(pattern = "HH:mm") LocalTime endTime,
        @JsonFormat(pattern = "HH:mm") LocalTime breakStart, @JsonFormat(pattern = "HH:mm") LocalTime breakEnd,
        Integer lateToleranceMinutes, Integer earlyToleranceMinutes, String roundingMode, Integer roundingMinutes) {
}
