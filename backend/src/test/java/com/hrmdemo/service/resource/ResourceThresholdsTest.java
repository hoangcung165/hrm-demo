package com.hrmdemo.service.resource;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import com.hrmdemo.service.resource.ResourceThresholds.Level;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ResourceThresholdsTest {

    @Test
    void theDefaultsAreFiftyNinetyAndFourWeeks() {
        assertThat(ResourceThresholds.DEFAULTS).isEqualTo(new ResourceThresholds(50, 90, 4));
    }

    @ParameterizedTest
    @CsvSource({"0,BENCH", "49,BENCH", "50,PARTIAL", "89,PARTIAL", "90,FULL", "100,FULL", "101,OVER", "120,OVER"})
    void aLoadFallsOnTheScaleOfTheDefaults(int percent, Level level) {
        assertThat(ResourceThresholds.DEFAULTS.levelOf(percent)).isEqualTo(level);
    }

    @Test
    void theScaleFollowsTheConfiguredThresholdsButOverloadIsAlwaysAboveOneHundred() {
        ResourceThresholds own = new ResourceThresholds(70, 95, 6);

        assertThat(own.levelOf(69)).isEqualTo(Level.BENCH);
        assertThat(own.levelOf(70)).isEqualTo(Level.PARTIAL);
        assertThat(own.levelOf(94)).isEqualTo(Level.PARTIAL);
        assertThat(own.levelOf(95)).isEqualTo(Level.FULL);
        assertThat(own.levelOf(100)).isEqualTo(Level.FULL);
        assertThat(own.levelOf(101)).isEqualTo(Level.OVER);
    }

    @Test
    void usableValuesHaveNoErrors() {
        assertThat(ResourceThresholds.check(50, 90, 4)).isEmpty();
        assertThat(ResourceThresholds.check(1, 2, 1)).isEmpty();
        assertThat(ResourceThresholds.check(99, 100, 12)).isEmpty();
    }

    @Test
    void everyFailingFieldIsReportedAtOnce() {
        assertThat(ResourceThresholds.check(null, 101, 0)).containsExactly(
                error("benchPercent", "required"), error("nearFullPercent", "out_of_range"),
                error("endingWeeks", "out_of_range"));
        assertThat(ResourceThresholds.check(0, null, 13)).containsExactly(
                error("benchPercent", "out_of_range"), error("nearFullPercent", "required"),
                error("endingWeeks", "out_of_range"));
    }

    @Test
    void theBenchThresholdMustBeBelowTheNearFullLevel() {
        assertThat(ResourceThresholds.check(95, 90, 4)).containsExactly(error("benchPercent", "not_below_near_full"));
        assertThat(ResourceThresholds.check(90, 90, 4)).containsExactly(error("benchPercent", "not_below_near_full"));
    }

    private static Map<String, String> error(String field, String code) {
        return Map.of("field", field, "code", code);
    }
}
