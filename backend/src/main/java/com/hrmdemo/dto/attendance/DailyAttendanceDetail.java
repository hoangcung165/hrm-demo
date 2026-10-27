package com.hrmdemo.dto.attendance;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.hrmdemo.dto.attendance.DailyAttendanceResponse.Day;
import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One Công theo ngày with what the day drawer shows: the shift and its rules, and every raw Lần quẹt of the Khung ca
 * with how the Bộ xử lý chấm công used it and the import it came from.
 *
 * @param shift null for a day with punches and no shift
 * @param punches in time order; for a day without a shift the punches of that calendar day, all {@code OUTSIDE}
 */
public record DailyAttendanceDetail(EmployeeCard employee, @Schema(nullable = true) UUID orgUnitId, Day day,
        @Schema(nullable = true) ShiftDetail shift, List<PunchLine> punches,
        @Schema(nullable = true) OffsetDateTime coveredUntil) {

    /**
     * @param windowFrom the start of the Khung ca, where punches begin to count for this shift
     * @param windowTo the end of the Khung ca
     * @param roundingMode NONE, UP, DOWN or NEAREST
     */
    public record ShiftDetail(UUID id, String code, String name, @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @JsonFormat(pattern = "HH:mm") LocalTime endTime, boolean crossesMidnight,
            @Schema(nullable = true) @JsonFormat(pattern = "HH:mm") LocalTime breakStart,
            @Schema(nullable = true) @JsonFormat(pattern = "HH:mm") LocalTime breakEnd, int lateToleranceMinutes,
            int earlyToleranceMinutes, String roundingMode, @Schema(nullable = true) Integer roundingMinutes,
            OffsetDateTime windowFrom, OffsetDateTime windowTo) {
    }

    /**
     * @param role IN, OUT, DUPLICATE (closer than the minimum gap to the one before), MIDDLE (between In and Out, not
     *        used) or OUTSIDE (in no Khung ca)
     * @param device the machine, when the file said
     * @param source null for a punch with no import
     */
    public record PunchLine(OffsetDateTime at, String role, @Schema(nullable = true) String device,
            @Schema(nullable = true) SourceImport source) {
    }

    /** The import a punch came from; {@code importedBy} is the name of the Account that imported it. */
    public record SourceImport(UUID id, String fileName, OffsetDateTime importedAt,
            @Schema(nullable = true) String importedBy) {
    }
}
