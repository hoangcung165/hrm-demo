package com.hrmdemo.service.attendance;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import com.hrmdemo.entity.shift.RoundingMode;
import com.hrmdemo.entity.shift.ShiftPattern;
import com.hrmdemo.service.attendance.AttendanceProcessor.Adjustment;
import com.hrmdemo.service.attendance.AttendanceProcessor.Corrections;
import com.hrmdemo.service.attendance.AttendanceProcessor.DailyRecord;
import com.hrmdemo.service.attendance.AttendanceProcessor.Flag;
import com.hrmdemo.service.attendance.AttendanceProcessor.LeavePart;
import com.hrmdemo.service.attendance.AttendanceProcessor.ManualDay;
import com.hrmdemo.service.attendance.AttendanceProcessor.ManualKind;
import com.hrmdemo.service.attendance.AttendanceProcessor.Result;
import com.hrmdemo.service.attendance.AttendanceProcessor.Role;
import com.hrmdemo.service.attendance.AttendanceProcessor.Rules;
import com.hrmdemo.service.attendance.AttendanceProcessor.Source;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class AttendanceProcessorTest {

    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final LocalDate MON = LocalDate.of(2026, 10, 12);
    static final LocalDate TUE = MON.plusDays(1);

    /** 08:00-17:00, lunch 12:00-13:00, 5 minutes tolerance, rounded down to 5 minutes. */
    static final ShiftPattern DAY = new ShiftPattern("Hành chính", LocalTime.of(8, 0), LocalTime.of(17, 0),
            LocalTime.of(12, 0), LocalTime.of(13, 0), 5, 5, RoundingMode.DOWN, 5);
    /** 22:00-06:00, no break, no tolerance, no rounding. */
    static final ShiftPattern NIGHT = new ShiftPattern("Ca đêm", LocalTime.of(22, 0), LocalTime.of(6, 0), null, null,
            0, 0, RoundingMode.NONE, null);

    final AttendanceProcessor processor = new AttendanceProcessor(Rules.DEFAULT, ZONE);

    static Instant at(LocalDate day, int hour, int minute) {
        return day.atTime(hour, minute).atZone(ZONE).toInstant();
    }

    static Instant at(LocalDate day, int hour, int minute, int second) {
        return day.atTime(hour, minute, second).atZone(ZONE).toInstant();
    }

    Result run(List<Instant> punches, Map<LocalDate, ShiftPattern> shifts) {
        return processor.process(punches, MON, MON.plusDays(4), shifts, Map.of(), Map.of());
    }

    DailyRecord one(List<Instant> punches, ShiftPattern shift) {
        return run(punches, Map.of(MON, shift)).days().get(0);
    }

    @Test
    void onTimeDayIsPairedAndFullyWorked() {
        DailyRecord day = one(List.of(at(MON, 7, 55), at(MON, 17, 5)), DAY);

        assertThat(day.in()).isEqualTo(at(MON, 7, 55));
        assertThat(day.out()).isEqualTo(at(MON, 17, 5));
        assertThat(day.lateMinutes()).isZero();
        assertThat(day.earlyLeaveMinutes()).isZero();
        assertThat(day.workedMinutes()).isEqualTo(8 * 60);
        assertThat(day.flags()).isEmpty();
    }

    @Test
    void lateWithinToleranceIsNotLateButLateBeyondCountsFromStart() {
        DailyRecord within = one(List.of(at(MON, 8, 5, 40), at(MON, 17, 0)), DAY);
        assertThat(within.lateMinutes()).isZero();

        DailyRecord beyond = one(List.of(at(MON, 8, 6), at(MON, 17, 0)), DAY);
        assertThat(beyond.lateMinutes()).isEqualTo(6);
        assertThat(beyond.workedMinutes()).isEqualTo(8 * 60 - 6 - 4); // 7:54 rounded down to 7:50
    }

    @Test
    void earlyLeaveRespectsToleranceAndCountsToTheEnd() {
        assertThat(one(List.of(at(MON, 8, 0), at(MON, 16, 55)), DAY).earlyLeaveMinutes()).isZero();

        DailyRecord early = one(List.of(at(MON, 8, 0), at(MON, 16, 30)), DAY);
        assertThat(early.earlyLeaveMinutes()).isEqualTo(30);
        assertThat(early.workedMinutes()).isEqualTo(7 * 60 + 30);
    }

    @Test
    void singlePunchNearTheStartIsAMissingOut() {
        DailyRecord day = one(List.of(at(MON, 8, 2)), DAY);

        assertThat(day.in()).isEqualTo(at(MON, 8, 2));
        assertThat(day.out()).isNull();
        assertThat(day.flags()).containsExactly(Flag.MISSING_OUT);
        assertThat(day.workedMinutes()).isZero();
        assertThat(day.earlyLeaveMinutes()).isZero();
    }

    @Test
    void singlePunchNearTheEndIsAMissingIn() {
        DailyRecord day = one(List.of(at(MON, 17, 3)), DAY);

        assertThat(day.in()).isNull();
        assertThat(day.out()).isEqualTo(at(MON, 17, 3));
        assertThat(day.flags()).containsExactly(Flag.MISSING_IN);
        assertThat(day.lateMinutes()).isZero();
    }

    @Test
    void punchesCloserThanTheMinimumGapCountOnce() {
        DailyRecord day = one(List.of(at(MON, 8, 0), at(MON, 8, 1), at(MON, 17, 0), at(MON, 17, 1)), DAY);

        assertThat(day.flags()).containsExactly(Flag.DUPLICATE_PUNCH);
        assertThat(day.in()).isEqualTo(at(MON, 8, 0));
        assertThat(day.out()).isEqualTo(at(MON, 17, 0));
        assertThat(day.punches()).extracting(p -> p.role()).containsExactly(Role.IN, Role.DUPLICATE, Role.OUT,
                Role.DUPLICATE);
    }

    @Test
    void aDoublePunchAloneIsStillASinglePunchNotAPair() {
        DailyRecord day = one(List.of(at(MON, 8, 0), at(MON, 8, 1)), DAY);

        assertThat(day.flags()).containsExactlyInAnyOrder(Flag.DUPLICATE_PUNCH, Flag.MISSING_OUT);
        assertThat(day.out()).isNull();
    }

    @Test
    void nightShiftBelongsToItsStartDayAndReadsTheNextCalendarDay() {
        DailyRecord day = one(List.of(at(MON, 21, 58), at(TUE, 6, 2)), NIGHT);

        assertThat(day.date()).isEqualTo(MON);
        assertThat(day.in()).isEqualTo(at(MON, 21, 58));
        assertThat(day.out()).isEqualTo(at(TUE, 6, 2));
        assertThat(day.workedMinutes()).isEqualTo(8 * 60);
        assertThat(day.lateMinutes()).isZero();
        assertThat(day.earlyLeaveMinutes()).isZero();
        assertThat(day.flags()).isEmpty();
    }

    @Test
    void consecutiveNightShiftsEachGetTheirOwnPair() {
        Result result = run(List.of(at(MON, 22, 0), at(TUE, 6, 0), at(TUE, 22, 3), at(TUE.plusDays(1), 6, 1)),
                Map.of(MON, NIGHT, TUE, NIGHT));

        assertThat(result.days()).hasSize(2);
        assertThat(result.days().get(0).out()).isEqualTo(at(TUE, 6, 0));
        assertThat(result.days().get(1).in()).isEqualTo(at(TUE, 22, 3));
        assertThat(result.days().get(1).lateMinutes()).isEqualTo(3);
    }

    @Test
    void nightShiftOutAtTheStartOfTheRangeBelongsToTheDayBeforeTheRange() {
        // Range starts on Tuesday; Monday's night shift is given as context and not returned.
        Result result = processor.process(List.of(at(MON, 22, 0), at(TUE, 6, 0), at(TUE, 22, 0), at(TUE.plusDays(1), 6, 0)),
                TUE, TUE, Map.of(MON, NIGHT, TUE, NIGHT), Map.of(), Map.of());

        assertThat(result.days()).hasSize(1);
        assertThat(result.days().get(0).date()).isEqualTo(TUE);
        assertThat(result.days().get(0).in()).isEqualTo(at(TUE, 22, 0));
        assertThat(result.unassigned()).isEmpty();
    }

    @Test
    void aPunchInTwoWindowsGoesToTheNearerShift() {
        // Day shift ends 17:00, night shift starts 22:00: a 19:30 punch is 2.5 h from the day end, 2.5 h from night start.
        // 19:00 is 2 h from the day end and 3 h from the night start, so it is the day shift's Out.
        Result result = run(List.of(at(MON, 8, 0), at(MON, 19, 0)), Map.of(MON, DAY, TUE, NIGHT));

        assertThat(result.days().get(0).out()).isEqualTo(at(MON, 19, 0));
        assertThat(result.days().get(1).flags()).containsExactly(Flag.ABSENT);
    }

    @Test
    void noPunchOnAShiftDayIsAbsent() {
        DailyRecord day = one(List.of(), DAY);

        assertThat(day.flags()).containsExactly(Flag.ABSENT);
        assertThat(day.workedMinutes()).isZero();
        assertThat(day.in()).isNull();
    }

    @Test
    void holidayIsFlaggedNotAbsentAndNotJudged() {
        Result result = processor.process(List.of(), MON, MON, Map.of(MON, DAY), Map.of(MON, "Quốc khánh"), Map.of());

        DailyRecord day = result.days().get(0);
        assertThat(day.flags()).containsExactly(Flag.HOLIDAY);
        assertThat(day.holidayName()).isEqualTo("Quốc khánh");
    }

    @Test
    void approvedLeaveIsFlaggedNotAbsent() {
        Result result = processor.process(List.of(), MON, MON, Map.of(MON, DAY), Map.of(), Map.of(MON, LeavePart.WHOLE));

        DailyRecord day = result.days().get(0);
        assertThat(day.flags()).containsExactly(Flag.LEAVE);
        assertThat(day.leave()).isEqualTo(LeavePart.WHOLE);
    }

    @Test
    void halfDayLeaveJudgesNothingButStillPairsAndCountsWork() {
        Result result = processor.process(List.of(at(MON, 8, 0), at(MON, 12, 0)), MON, MON, Map.of(MON, DAY), Map.of(),
                Map.of(MON, LeavePart.AFTERNOON));

        DailyRecord day = result.days().get(0);
        assertThat(day.flags()).containsExactly(Flag.LEAVE);
        assertThat(day.earlyLeaveMinutes()).isZero();
        assertThat(day.workedMinutes()).isEqualTo(4 * 60);
    }

    @Test
    void breakIsTakenOffAndTimeOutsideTheShiftIsNotWorked() {
        DailyRecord day = one(List.of(at(MON, 7, 0), at(MON, 18, 0)), DAY);

        assertThat(day.workedMinutes()).isEqualTo(8 * 60);
    }

    @Test
    void roundingModesUseTheShiftStep() {
        assertThat(AttendanceProcessor.round(7, RoundingMode.DOWN, 5)).isEqualTo(5);
        assertThat(AttendanceProcessor.round(7, RoundingMode.UP, 5)).isEqualTo(10);
        assertThat(AttendanceProcessor.round(7, RoundingMode.NEAREST, 5)).isEqualTo(5);
        assertThat(AttendanceProcessor.round(8, RoundingMode.NEAREST, 5)).isEqualTo(10);
        assertThat(AttendanceProcessor.round(7, RoundingMode.NONE, 5)).isEqualTo(7);
    }

    @Test
    void roundingUpNeverExceedsTheScheduledMinutes() {
        ShiftPattern up = new ShiftPattern("Up", LocalTime.of(8, 0), LocalTime.of(17, 0), LocalTime.of(12, 0),
                LocalTime.of(13, 0), 0, 0, RoundingMode.UP, 30);
        DailyRecord day = one(List.of(at(MON, 8, 0), at(MON, 17, 0)), up);

        assertThat(day.workedMinutes()).isEqualTo(8 * 60);
    }

    @Test
    void punchWithNoShiftWindowIsReportedUnassigned() {
        Result result = processor.process(List.of(at(MON, 3, 0), at(MON.plusDays(5), 9, 0)), MON, MON.plusDays(6),
                Map.of(MON, DAY), Map.of(), Map.of());

        assertThat(result.unassigned()).extracting(p -> p.at()).containsExactly(at(MON, 3, 0), at(MON.plusDays(5), 9, 0));
        assertThat(result.unassigned()).allMatch(p -> p.role() == Role.OUTSIDE);
        assertThat(result.days().get(0).flags()).containsExactly(Flag.ABSENT);
    }

    @Test
    void sameInputGivesSameOutputInAnyPunchOrder() {
        List<Instant> punches = List.of(at(MON, 17, 0), at(MON, 8, 0), at(MON, 12, 30));

        assertThat(one(punches, DAY)).isEqualTo(one(List.of(at(MON, 8, 0), at(MON, 12, 30), at(MON, 17, 0)), DAY));
        assertThat(one(punches, DAY).punches()).extracting(p -> p.role()).containsExactly(Role.IN, Role.MIDDLE, Role.OUT);
    }

    // ----- Công thủ công (HRM-24) -----

    DailyRecord corrected(List<Instant> punches, ShiftPattern shift, Corrections corrections) {
        return processor.process(punches, MON, MON, Map.of(MON, shift), Map.of(), Map.of(), corrections).days().get(0);
    }

    static Corrections manual(ManualDay day) {
        return new Corrections(Map.of(MON, day), Map.of());
    }

    static Corrections adjusted(Instant in, Instant out) {
        return new Corrections(Map.of(), Map.of(MON, new Adjustment(in, out)));
    }

    /** Machine punches of a late, short day (08:31 to 16:02) under each kind of Công thủ công. */
    static Stream<Arguments> manualKinds() {
        return Stream.of(
                Arguments.of(ManualDay.of(ManualKind.FULL), 8 * 60, 0, 0, Set.of()),
                Arguments.of(ManualDay.of(ManualKind.HALF), 4 * 60, 0, 0, Set.of()),
                Arguments.of(ManualDay.of(ManualKind.ABSENT), 0, 0, 0, Set.of(Flag.ABSENT)),
                // 08:20 to 17:00 less the lunch hour: 7:40; 20 minutes late.
                Arguments.of(ManualDay.times(at(MON, 8, 20), at(MON, 17, 0)), 7 * 60 + 40, 20, 0, Set.of()));
    }

    @ParameterizedTest
    @MethodSource("manualKinds")
    void manualEntryReplacesThePunchesAndIsNeverAddedToThem(ManualDay entry, int worked, int late, int early,
            Set<Flag> flags) {
        DailyRecord day = corrected(List.of(at(MON, 8, 31), at(MON, 16, 2)), DAY, manual(entry));

        assertThat(day.manual()).isEqualTo(entry.kind());
        assertThat(day.workedMinutes()).isEqualTo(worked);
        assertThat(day.lateMinutes()).isEqualTo(late);
        assertThat(day.earlyLeaveMinutes()).isEqualTo(early);
        assertThat(day.flags()).containsExactlyInAnyOrderElementsOf(flags);
        assertThat(day.punches()).extracting(p -> p.role()).containsExactly(Role.NOT_USED, Role.NOT_USED);
    }

    @Test
    void manualTimesAreTheInAndOutOfTheDay() {
        DailyRecord day = corrected(List.of(at(MON, 7, 50)), DAY,
                manual(ManualDay.times(at(MON, 7, 58), at(MON, 16, 40))));

        assertThat(day.in()).isEqualTo(at(MON, 7, 58));
        assertThat(day.out()).isEqualTo(at(MON, 16, 40));
        assertThat(day.inSource()).isEqualTo(Source.MANUAL);
        assertThat(day.outSource()).isEqualTo(Source.MANUAL);
        assertThat(day.earlyLeaveMinutes()).isEqualTo(20);
        assertThat(day.flags()).isEmpty();
    }

    @Test
    void manualDayWithoutPunchesIsNotAbsentUnlessEnteredSo() {
        DailyRecord full = corrected(List.of(), DAY, manual(ManualDay.of(ManualKind.FULL)));

        assertThat(full.flags()).isEmpty();
        assertThat(full.workedMinutes()).isEqualTo(8 * 60);
        assertThat(full.in()).isNull();
        assertThat(full.inSource()).isNull();
    }

    @Test
    void manualAbsentOnAHolidayJudgesNothing() {
        DailyRecord day = processor.process(List.of(), MON, MON, Map.of(MON, DAY), Map.of(MON, "Quốc khánh"), Map.of(),
                manual(ManualDay.of(ManualKind.ABSENT))).days().get(0);

        assertThat(day.flags()).containsExactly(Flag.HOLIDAY);
    }

    @Test
    void manualTimesAcrossMidnightOnANightShift() {
        DailyRecord day = corrected(List.of(), NIGHT, manual(ManualDay.times(at(MON, 22, 0), at(TUE, 6, 0))));

        assertThat(day.workedMinutes()).isEqualTo(8 * 60);
        assertThat(day.flags()).isEmpty();
    }

    @Test
    void manualTimesMustBeGivenForTimesOnly() {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> new ManualDay(ManualKind.FULL, at(MON, 8, 0), null))
                .isInstanceOf(IllegalArgumentException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> ManualDay.times(at(MON, 17, 0), at(MON, 8, 0)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ----- Đơn bổ sung công (HRM-24) -----

    @Test
    void approvedAdjustmentFillsAMissingOut() {
        DailyRecord day = corrected(List.of(at(MON, 7, 58)), DAY, adjusted(null, at(MON, 17, 5)));

        assertThat(day.flags()).isEmpty();
        assertThat(day.out()).isEqualTo(at(MON, 17, 5));
        assertThat(day.inSource()).isEqualTo(Source.PUNCH);
        assertThat(day.outSource()).isEqualTo(Source.ADJUSTMENT);
        assertThat(day.workedMinutes()).isEqualTo(8 * 60);
        assertThat(day.punches()).extracting(p -> p.role()).containsExactly(Role.IN);
    }

    @Test
    void approvedAdjustmentFillsAMissingInAndLatenessFollowsTheNewTime() {
        DailyRecord day = corrected(List.of(at(MON, 17, 2)), DAY, adjusted(at(MON, 8, 20), null));

        assertThat(day.flags()).isEmpty();
        assertThat(day.inSource()).isEqualTo(Source.ADJUSTMENT);
        assertThat(day.lateMinutes()).isEqualTo(20);
        assertThat(day.workedMinutes()).isEqualTo(7 * 60 + 40);
    }

    @Test
    void approvedAdjustmentOfBothSidesClearsAbsent() {
        DailyRecord day = corrected(List.of(), DAY, adjusted(at(MON, 8, 0), at(MON, 17, 0)));

        assertThat(day.flags()).isEmpty();
        assertThat(day.workedMinutes()).isEqualTo(8 * 60);
    }

    @Test
    void adjustmentOfOneSideOnAnAbsentDayLeavesTheOtherMissing() {
        DailyRecord day = corrected(List.of(), DAY, adjusted(at(MON, 8, 0), null));

        assertThat(day.flags()).containsExactly(Flag.MISSING_OUT);
        assertThat(day.workedMinutes()).isZero();
    }

    @Test
    void aPunchedSideIsNeverReplacedByAnAdjustment() {
        DailyRecord day = corrected(List.of(at(MON, 8, 31), at(MON, 17, 0)), DAY, adjusted(at(MON, 7, 55), at(MON, 18, 0)));

        assertThat(day.in()).isEqualTo(at(MON, 8, 31));
        assertThat(day.out()).isEqualTo(at(MON, 17, 0));
        assertThat(day.inSource()).isEqualTo(Source.PUNCH);
        assertThat(day.lateMinutes()).isEqualTo(31);
    }

    @Test
    void withoutCorrectionsEveryTimeComesFromAPunch() {
        DailyRecord day = one(List.of(at(MON, 8, 0), at(MON, 17, 0)), DAY);

        assertThat(day.inSource()).isEqualTo(Source.PUNCH);
        assertThat(day.outSource()).isEqualTo(Source.PUNCH);
        assertThat(day.manual()).isNull();
        assertThat(corrected(List.of(at(MON, 8, 0), at(MON, 17, 0)), DAY, Corrections.NONE)).isEqualTo(day);
    }
}
