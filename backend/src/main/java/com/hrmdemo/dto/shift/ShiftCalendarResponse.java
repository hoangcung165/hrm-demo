package com.hrmdemo.dto.shift;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.hrmdemo.dto.employee.EmployeeCard;

/**
 * The Lịch ca of a range: per Employee and day the effective Ca làm việc.
 *
 * @param days every day of the range with the company's holiday and day-off flags, so the grid can mark them
 * @param shifts the shifts that appear in the rows, so a cell needs only a shift id
 * @param rows the Employees of the page, by name; a row lists only the days that have a shift
 * @param total Employees that pass the filters (every page)
 */
public record ShiftCalendarResponse(LocalDate from, LocalDate to, List<Day> days, List<ShiftBrief> shifts,
        List<Row> rows, long total, int page, int size) {

    /**
     * @param holiday the name of the Ngày lễ, or null
     * @param dayKind the Lịch làm việc of the weekday: FULL, MORNING or OFF
     */
    public record Day(LocalDate date, String holiday, String dayKind) {
    }

    /** A shift as a cell shows it; {@code crossesMidnight} shifts end on the day after the cell's day. */
    public record ShiftBrief(UUID id, String code, String name, @JsonFormat(pattern = "HH:mm") LocalTime startTime,
            @JsonFormat(pattern = "HH:mm") LocalTime endTime, boolean crossesMidnight, boolean active) {
    }

    public record Row(EmployeeCard employee, UUID orgUnitId, List<Cell> cells) {
    }

    /** @param source ASSIGNED (a Phân ca) or DEFAULT (the Ca mặc định of the unit) */
    public record Cell(LocalDate date, UUID shiftId, String source) {
    }
}
