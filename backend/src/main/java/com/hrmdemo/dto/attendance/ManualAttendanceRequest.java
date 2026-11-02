package com.hrmdemo.dto.attendance;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Enter the same Công thủ công for people on a range of days, replacing what they have there. Give either
 * {@code employeeIds} or {@code orgUnitId}, not both. Only days with a Ca làm việc get an entry; the others are skipped
 * and reported.
 *
 * @param employeeIds up to 500 active Employees in the caller's data scope
 * @param orgUnitId an Đơn vị tổ chức: its active Employees and those of every unit below it (up to 500)
 * @param from first day, at most 62 days up to {@code to}; no day after today
 * @param days only these days of the range; left out means every day of the range
 * @param kind FULL (Đủ công), HALF (Nửa công), ABSENT (Vắng) or TIMES (Giờ vào – ra)
 * @param in for TIMES only
 * @param out for TIMES only; at or before {@code in} means the next calendar day, allowed on a shift that crosses
 *        midnight only
 * @param note up to 500 characters
 */
public record ManualAttendanceRequest(List<UUID> employeeIds, UUID orgUnitId, LocalDate from, LocalDate to,
        List<LocalDate> days, String kind,
        @Schema(nullable = true, type = "string", example = "08:00") @JsonFormat(pattern = "HH:mm") LocalTime in,
        @Schema(nullable = true, type = "string", example = "17:00") @JsonFormat(pattern = "HH:mm") LocalTime out,
        @Schema(nullable = true) String note) {
}
