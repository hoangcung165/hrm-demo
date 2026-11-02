package com.hrmdemo.dto.attendance;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The Công thủ công of people for a range: per Employee the days that have a Ca làm việc and the entries.
 *
 * @param rows the active Employees of the unit (and the units below it) or the people asked for, by name
 */
public record ManualAttendanceResponse(LocalDate from, LocalDate to, List<Row> rows) {

    /**
     * @param shiftDays the days of the range with a Ca làm việc, where an entry can be made
     * @param entries the Công thủ công of the range, by day
     */
    public record Row(EmployeeCard employee, @Schema(nullable = true) UUID orgUnitId, List<LocalDate> shiftDays,
            List<Entry> entries) {
    }

    /**
     * @param kind FULL, HALF, ABSENT or TIMES
     * @param enteredBy the name of the Account that saved it last
     */
    public record Entry(LocalDate date, String kind,
            @Schema(nullable = true, type = "string") @JsonFormat(pattern = "HH:mm") LocalTime in,
            @Schema(nullable = true, type = "string") @JsonFormat(pattern = "HH:mm") LocalTime out,
            @Schema(nullable = true) String note, @Schema(nullable = true) String enteredBy,
            OffsetDateTime enteredAt) {
    }
}
