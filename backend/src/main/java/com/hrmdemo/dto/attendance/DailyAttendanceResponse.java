package com.hrmdemo.dto.attendance;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.shift.ShiftCalendarResponse.ShiftBrief;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Công theo ngày of a range: per Employee of the page the processed days, with totals for the whole range.
 *
 * @param coveredUntil the latest stored Lần quẹt of the company, or null when there is none; days that start after it
 *        are {@code noLog}
 * @param lastImportAt when the Log quẹt thẻ was last imported, or null
 * @param shifts the shifts that appear in the rows, so a day needs only a shift id
 * @param rows the Employees of the page; with {@code abnormalOnly} only their abnormal days
 * @param total Employees that pass the filters (every page)
 */
public record DailyAttendanceResponse(LocalDate from, LocalDate to,
        @Schema(nullable = true) OffsetDateTime coveredUntil, @Schema(nullable = true) OffsetDateTime lastImportAt,
        List<ShiftBrief> shifts, List<Row> rows, long total, int page, int size) {

    /** @param totals over every day of the range, also when {@code days} lists only the abnormal ones */
    public record Row(EmployeeCard employee, @Schema(nullable = true) UUID orgUnitId, Totals totals, List<Day> days) {
    }

    /**
     * @param workedDays days with both an In and an Out
     * @param lateDays days with late minutes
     * @param earlyLeaveDays days with early-leave minutes
     * @param missingPunchDays days with a missing In or a missing Out
     * @param absentDays days with a shift and no punch, leave or holiday
     * @param leaveDays days with approved leave (a half day counts as a day)
     */
    public record Totals(int workedDays, int workedMinutes, int lateDays, int earlyLeaveDays, int missingPunchDays,
            int absentDays, int leaveDays) {
    }

    /**
     * One day. Times carry the offset of the company, so they read as wall-clock time.
     *
     * @param shiftId null for a day with punches and no shift ({@code NO_SHIFT})
     * @param flags {@code MISSING_IN}, {@code MISSING_OUT}, {@code ABSENT}, {@code DUPLICATE_PUNCH}, {@code LEAVE},
     *        {@code HOLIDAY}, {@code NO_SHIFT}
     * @param leave {@code WHOLE}, {@code MORNING} or {@code AFTERNOON}, or null
     * @param noLog the log does not cover this day yet (or today's shift window is still open): absent and missing
     *        punches are not judged
     */
    public record Day(LocalDate date, @Schema(nullable = true) UUID shiftId,
            @Schema(nullable = true) OffsetDateTime in, @Schema(nullable = true) OffsetDateTime out,
            int workedMinutes, int lateMinutes, int earlyLeaveMinutes, List<String> flags,
            @Schema(nullable = true) String holiday, @Schema(nullable = true) String leave, boolean noLog) {
    }
}
