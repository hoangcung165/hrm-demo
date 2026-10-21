package com.hrmdemo.service.shift;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.service.workschedule.WorkWeek;
import org.junit.jupiter.api.Test;

class EffectiveShiftsTest {

    static final LocalDate MONDAY = LocalDate.of(2026, 11, 2);
    static final LocalDate SATURDAY = MONDAY.plusDays(5);
    static final LocalDate WEDNESDAY = MONDAY.plusDays(2);

    final UUID company = UUID.randomUUID();
    final UUID department = UUID.randomUUID();
    final UUID team = UUID.randomUUID();
    final UUID morning = UUID.randomUUID();
    final UUID night = UUID.randomUUID();
    final UUID evening = UUID.randomUUID();

    EffectiveShifts shifts(Map<UUID, UUID> defaults, Map<LocalDate, String> holidays) {
        // department -> team; company is above department.
        return new EffectiveShifts(Map.of(department, company, team, department), defaults, WorkWeek.DEFAULT,
                holidays);
    }

    @Test
    void anExplicitAssignmentWinsOverTheDefault() {
        EffectiveShifts effective = shifts(Map.of(team, morning), Map.of());

        assertThat(effective.of(team, MONDAY, night)).contains(new EffectiveShifts.Cell(night,
                EffectiveShifts.Source.ASSIGNED));
    }

    @Test
    void theDefaultFillsAWorkingDayAndSaysSo() {
        EffectiveShifts effective = shifts(Map.of(team, morning), Map.of());

        assertThat(effective.of(team, MONDAY, null)).contains(new EffectiveShifts.Cell(morning,
                EffectiveShifts.Source.DEFAULT));
    }

    @Test
    void aDefaultNeverFillsAWeekendOrAHoliday() {
        EffectiveShifts effective = shifts(Map.of(team, morning), Map.of(WEDNESDAY, "Lễ"));

        assertThat(effective.of(team, SATURDAY, null)).isEmpty();
        assertThat(effective.of(team, SATURDAY.plusDays(1), null)).isEmpty();
        assertThat(effective.of(team, WEDNESDAY, null)).isEmpty();
    }

    @Test
    void anExplicitAssignmentStillHoldsOnAWeekendOrAHoliday() {
        EffectiveShifts effective = shifts(Map.of(team, morning), Map.of(WEDNESDAY, "Lễ"));

        assertThat(effective.of(team, SATURDAY, night)).hasValueSatisfying(
                cell -> assertThat(cell.source()).isEqualTo(EffectiveShifts.Source.ASSIGNED));
        assertThat(effective.of(team, WEDNESDAY, night)).isPresent();
    }

    @Test
    void theNearestDefaultAboveTheUnitApplies() {
        EffectiveShifts effective = shifts(Map.of(company, evening, department, morning), Map.of());

        // The team has none: the department's wins over the company's.
        assertThat(effective.defaultShiftOf(team)).contains(morning);
        assertThat(effective.defaultShiftOf(department)).contains(morning);
        assertThat(effective.defaultShiftOf(company)).contains(evening);
    }

    @Test
    void aUnitsOwnDefaultWinsOverTheOnesAbove() {
        EffectiveShifts effective = shifts(Map.of(department, morning, team, night), Map.of());

        assertThat(effective.defaultShiftOf(team)).contains(night);
        assertThat(effective.defaultShiftOf(department)).contains(morning);
    }

    @Test
    void noUnitOrNoDefaultAboveMeansNoShift() {
        EffectiveShifts effective = shifts(Map.of(), Map.of());

        assertThat(effective.of(null, MONDAY, null)).isEmpty();
        assertThat(effective.of(team, MONDAY, null)).isEmpty();
        assertThat(effective.defaultShiftOf(null)).isEmpty();
    }

    @Test
    void aLoopInTheTreeEndsInsteadOfRunningForever() {
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        EffectiveShifts looped = new EffectiveShifts(Map.of(a, b, b, a), Map.of(), WorkWeek.DEFAULT, Map.of());

        assertThat(looped.defaultShiftOf(a)).isEmpty();
    }

    @Test
    void aNightShiftIsTheCellOfItsStartDayOnly() {
        // The shift crosses midnight, but the assignment is the day it starts: Monday has the cell, Tuesday does not.
        EffectiveShifts effective = shifts(Map.of(), Map.of());

        assertThat(effective.of(team, MONDAY, night)).isPresent();
        assertThat(effective.of(team, MONDAY.plusDays(1), null)).isEmpty();
    }
}
