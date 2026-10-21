package com.hrmdemo.dto.shift;

import java.time.LocalDate;
import java.util.List;

/**
 * What an assignment did.
 *
 * @param days the days covered, in order
 * @param created Phân ca that did not exist
 * @param replaced Phân ca that had another shift
 * @param unchanged Phân ca that already had this shift
 * @param skipped chosen days left out because they are a holiday or a day off of the Lịch làm việc
 */
public record ShiftAssignResult(int employees, List<LocalDate> days, int created, int replaced, int unchanged,
        List<SkippedDay> skipped) {

    /** @param reason HOLIDAY or DAY_OFF; {@code name} is the holiday's name */
    public record SkippedDay(LocalDate date, String reason, String name) {
    }
}
