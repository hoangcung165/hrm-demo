package com.hrmdemo.service.shift;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;

import com.hrmdemo.dto.workschedule.WorkDayKind;
import com.hrmdemo.service.workschedule.WorkWeek;
import org.junit.jupiter.api.Test;

class ShiftDaySelectionTest {

    static final LocalDate MONDAY = LocalDate.of(2026, 11, 2);
    static final LocalDate SUNDAY = MONDAY.plusDays(6);

    @Test
    void everyWeekdayMeansTheWorkingDaysOfTheLichLamViecAndTheOthersAreReportedAsDaysOff() {
        ShiftDaySelection.Result result = ShiftDaySelection.of(MONDAY, SUNDAY, null, WorkWeek.DEFAULT, Map.of(),
                Set.of());

        assertThat(result.days()).containsExactly(MONDAY, MONDAY.plusDays(1), MONDAY.plusDays(2),
                MONDAY.plusDays(3), MONDAY.plusDays(4));
        assertThat(result.skipped()).extracting(ShiftDaySelection.Skipped::date)
                .containsExactly(MONDAY.plusDays(5), SUNDAY);
        assertThat(result.skipped()).extracting(ShiftDaySelection.Skipped::reason)
                .containsOnly(ShiftDaySelection.Reason.DAY_OFF);
    }

    @Test
    void aHolidayIsSkippedWithItsName() {
        LocalDate wednesday = MONDAY.plusDays(2);

        ShiftDaySelection.Result result = ShiftDaySelection.of(MONDAY, MONDAY.plusDays(4), null, WorkWeek.DEFAULT,
                Map.of(wednesday, "Ngày kiểm thử"), Set.of());

        assertThat(result.days()).doesNotContain(wednesday).hasSize(4);
        assertThat(result.skipped()).containsExactly(
                new ShiftDaySelection.Skipped(wednesday, ShiftDaySelection.Reason.HOLIDAY, "Ngày kiểm thử"));
    }

    @Test
    void onlyTheChosenWeekdaysAreCoveredAndTheOthersAreNotReported() {
        ShiftDaySelection.Result result = ShiftDaySelection.of(MONDAY, SUNDAY.plusDays(7),
                Set.of(DayOfWeek.MONDAY, DayOfWeek.SATURDAY), WorkWeek.DEFAULT, Map.of(), Set.of());

        assertThat(result.days()).containsExactly(MONDAY, MONDAY.plusDays(7));
        // The chosen Saturdays are days off, so they are said to be skipped; Tuesday to Friday were never asked for.
        assertThat(result.skipped()).extracting(ShiftDaySelection.Skipped::date)
                .containsExactly(MONDAY.plusDays(5), MONDAY.plusDays(12));
    }

    @Test
    void aDayListedExplicitlyIsCoveredEvenOnADayOffOrAHoliday() {
        LocalDate saturday = MONDAY.plusDays(5);
        LocalDate wednesday = MONDAY.plusDays(2);

        ShiftDaySelection.Result result = ShiftDaySelection.of(MONDAY, SUNDAY, Set.of(DayOfWeek.MONDAY),
                WorkWeek.DEFAULT, Map.of(wednesday, "Lễ"), Set.of(saturday, wednesday));

        assertThat(result.days()).containsExactly(MONDAY, wednesday, saturday);
        assertThat(result.skipped()).isEmpty();
    }

    @Test
    void aMorningOnlyDayIsAWorkingDay() {
        WorkWeek morningSaturday = new WorkWeek(Map.of(DayOfWeek.MONDAY, WorkDayKind.FULL, DayOfWeek.SATURDAY,
                WorkDayKind.MORNING));

        ShiftDaySelection.Result result = ShiftDaySelection.of(MONDAY, SUNDAY, null, morningSaturday, Map.of(),
                Set.of());

        assertThat(result.days()).containsExactly(MONDAY, MONDAY.plusDays(5));
    }

    @Test
    void aSingleDayRangeIsOneDayOrOneSkip() {
        assertThat(ShiftDaySelection.of(MONDAY, MONDAY, null, WorkWeek.DEFAULT, Map.of(), Set.of()).days())
                .containsExactly(MONDAY);
        assertThat(ShiftDaySelection.of(SUNDAY, SUNDAY, null, WorkWeek.DEFAULT, Map.of(), Set.of()).days())
                .isEmpty();
    }
}
