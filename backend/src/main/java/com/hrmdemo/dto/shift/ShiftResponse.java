package com.hrmdemo.dto.shift;

import java.time.LocalTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * A Ca làm việc with what its times imply.
 *
 * @param crossesMidnight the end is on the day after the start; the shift belongs to the day it starts
 * @param scheduledMinutes the length of the shift minus the break
 * @param nightMinutes scheduled minutes between 22:00 and 06:00
 */
public record ShiftResponse(UUID id, String code, String name,
        @JsonFormat(pattern = "HH:mm") LocalTime startTime, @JsonFormat(pattern = "HH:mm") LocalTime endTime,
        @JsonFormat(pattern = "HH:mm") LocalTime breakStart, @JsonFormat(pattern = "HH:mm") LocalTime breakEnd,
        int lateToleranceMinutes, int earlyToleranceMinutes, String roundingMode, Integer roundingMinutes,
        boolean active, boolean crossesMidnight, int scheduledMinutes, int nightMinutes) {
}
