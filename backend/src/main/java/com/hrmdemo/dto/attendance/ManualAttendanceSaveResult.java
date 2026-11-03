package com.hrmdemo.dto.attendance;

import java.time.LocalDate;
import java.util.List;

/**
 * What a save of Công thủ công did.
 *
 * @param employees the people the call covered
 * @param created entries that did not exist
 * @param replaced entries that had other values
 * @param unchanged entries that already had these values
 * @param skipped per day, how many of the people have no Ca làm việc on it and got no entry
 */
public record ManualAttendanceSaveResult(int employees, int created, int replaced, int unchanged,
        List<SkippedDay> skipped) {

    /** @param reason NO_SHIFT */
    public record SkippedDay(LocalDate date, String reason, int employees) {
    }
}
