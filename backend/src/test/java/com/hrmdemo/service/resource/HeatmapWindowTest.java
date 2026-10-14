package com.hrmdemo.service.resource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import com.hrmdemo.service.allocation.AllocationCalculator.Granularity;
import org.junit.jupiter.api.Test;

class HeatmapWindowTest {

    @Test
    void weeksStartOnTheMondayOfTheDayGiven() {
        // Wednesday 14/10/2026
        HeatmapWindow window = HeatmapWindow.of(Granularity.WEEK, LocalDate.of(2026, 10, 14), 12);

        assertThat(window.from()).isEqualTo(LocalDate.of(2026, 10, 12));
        assertThat(window.to()).isEqualTo(LocalDate.of(2027, 1, 3));
        assertThat(window.columns()).hasSize(12);
        assertThat(window.columns().get(0)).isEqualTo(
                new HeatmapWindow.Column(LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 18)));
        assertThat(window.columns().get(11).to()).isEqualTo(LocalDate.of(2027, 1, 3));
    }

    @Test
    void aSundayBelongsToTheWeekThatEndsOnIt() {
        HeatmapWindow window = HeatmapWindow.of(Granularity.WEEK, LocalDate.of(2026, 10, 18), 1);

        assertThat(window.from()).isEqualTo(LocalDate.of(2026, 10, 12));
        assertThat(window.to()).isEqualTo(LocalDate.of(2026, 10, 18));
    }

    @Test
    void monthsStartOnTheFirstAndFollowTheCalendar() {
        HeatmapWindow window = HeatmapWindow.of(Granularity.MONTH, LocalDate.of(2026, 10, 14), 6);

        assertThat(window.from()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(window.to()).isEqualTo(LocalDate.of(2027, 3, 31));
        assertThat(window.columns()).extracting(HeatmapWindow.Column::to).containsExactly(
                LocalDate.of(2026, 10, 31), LocalDate.of(2026, 11, 30), LocalDate.of(2026, 12, 31),
                LocalDate.of(2027, 1, 31), LocalDate.of(2027, 2, 28), LocalDate.of(2027, 3, 31));
    }

    @Test
    void theDefaultsAreTwelveWeeksAndSixMonths() {
        assertThat(HeatmapWindow.defaultCount(Granularity.WEEK)).isEqualTo(12);
        assertThat(HeatmapWindow.defaultCount(Granularity.MONTH)).isEqualTo(6);
    }

    @Test
    void aWindowHasOneToTwelveColumns() {
        assertThatThrownBy(() -> HeatmapWindow.of(Granularity.WEEK, LocalDate.of(2026, 10, 14), 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HeatmapWindow.of(Granularity.WEEK, LocalDate.of(2026, 10, 14), 13))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
