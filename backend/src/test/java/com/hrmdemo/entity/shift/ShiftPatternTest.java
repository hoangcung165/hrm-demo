package com.hrmdemo.entity.shift;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalTime;

import org.junit.jupiter.api.Test;

class ShiftPatternTest {

    static ShiftPattern shift(String start, String end, String breakStart, String breakEnd) {
        return new ShiftPattern("Test", LocalTime.parse(start), LocalTime.parse(end),
                breakStart == null ? null : LocalTime.parse(breakStart),
                breakEnd == null ? null : LocalTime.parse(breakEnd), 0, 0, RoundingMode.NONE, null);
    }

    @Test
    void aDayShiftWorksTheLengthMinusTheBreakAndHasNoNightMinutes() {
        ShiftPattern day = shift("08:00", "17:00", "12:00", "13:00");

        assertThat(day.crossesMidnight()).isFalse();
        assertThat(day.lengthMinutes()).isEqualTo(540);
        assertThat(day.breakMinutes()).isEqualTo(60);
        assertThat(day.scheduledMinutes()).isEqualTo(480);
        assertThat(day.nightMinutes()).isZero();
        assertThat(day.breakInsideShift()).isTrue();
    }

    @Test
    void aShiftWithoutBreakWorksItsWholeLength() {
        ShiftPattern half = shift("08:00", "12:00", null, null);

        assertThat(half.scheduledMinutes()).isEqualTo(240);
        assertThat(half.breakMinutes()).isZero();
    }

    @Test
    void anEndAtOrBeforeTheStartCrossesMidnight() {
        ShiftPattern night = shift("22:00", "06:00", "01:00", "02:00");

        assertThat(night.crossesMidnight()).isTrue();
        assertThat(night.lengthMinutes()).isEqualTo(480);
        assertThat(night.scheduledMinutes()).isEqualTo(420);
        assertThat(night.breakInsideShift()).isTrue();
        // Every scheduled minute lies between 22:00 and 06:00.
        assertThat(night.nightMinutes()).isEqualTo(420);
    }

    @Test
    void theBreakMayStartBeforeMidnightAndEndAfterIt() {
        ShiftPattern night = shift("20:00", "04:00", "23:30", "00:30");

        assertThat(night.breakStartOffset()).isEqualTo(210);
        assertThat(night.breakEndOffset()).isEqualTo(270);
        assertThat(night.breakInsideShift()).isTrue();
        assertThat(night.scheduledMinutes()).isEqualTo(420);
        // 22:00-04:00 is 360 minutes of night, 60 of them in the break.
        assertThat(night.nightMinutes()).isEqualTo(300);
    }

    @Test
    void anEveningShiftCountsOnlyTheMinutesFrom2200() {
        ShiftPattern evening = shift("14:00", "23:00", null, null);

        assertThat(evening.crossesMidnight()).isFalse();
        assertThat(evening.nightMinutes()).isEqualTo(60);
    }

    @Test
    void anEarlyShiftCountsTheMinutesBefore0600() {
        ShiftPattern early = shift("05:00", "13:00", "09:00", "10:00");

        assertThat(early.nightMinutes()).isEqualTo(60);
        assertThat(early.scheduledMinutes()).isEqualTo(420);
    }

    @Test
    void aBreakOutsideTheShiftOrEmptyIsNotInside() {
        assertThat(shift("08:00", "17:00", "17:30", "18:00").breakInsideShift()).isFalse();
        assertThat(shift("08:00", "17:00", "07:00", "09:00").breakInsideShift()).isFalse();
        assertThat(shift("08:00", "17:00", "12:00", "12:00").breakInsideShift()).isFalse();
        assertThat(shift("08:00", "17:00", "13:00", "12:00").breakInsideShift()).isFalse();
        assertThat(shift("08:00", "17:00", "16:00", "17:00").breakInsideShift()).isTrue();
    }
}
