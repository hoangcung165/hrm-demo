package com.hrmdemo.service.resource;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * The thresholds that sort Tải phân bổ into the heatmap scale. Pure value: the service stores and loads it.
 * <p>
 * Below {@code benchPercent} is Bench; from {@code nearFullPercent} to 100 is nearly full; above 100 is Quá tải
 * whatever the settings say.
 *
 * @param benchPercent    Tải phân bổ below this is Bench
 * @param nearFullPercent from this up to 100 the cell is drawn dark
 * @param endingWeeks     an allocation ending within this many weeks is Sắp hết dự án
 */
public record ResourceThresholds(int benchPercent, int nearFullPercent, int endingWeeks) {

    public static final ResourceThresholds DEFAULTS = new ResourceThresholds(50, 90, 4);

    public static final int MAX_ENDING_WEEKS = 12;

    /** Where a load falls on the heatmap scale. */
    public enum Level {
        BENCH, PARTIAL, FULL, OVER
    }

    public Level levelOf(int percent) {
        if (percent > 100) {
            return Level.OVER;
        }
        if (percent >= nearFullPercent) {
            return Level.FULL;
        }
        return percent < benchPercent ? Level.BENCH : Level.PARTIAL;
    }

    /**
     * The failing fields of a request, as {@code (field, code)}; empty when the values are usable. A missing value is
     * {@code required}; a number outside its range is {@code out_of_range}; a bench threshold that is not below the
     * near-full level is {@code not_below_near_full} on {@code benchPercent}.
     */
    public static List<Map<String, String>> check(Integer benchPercent, Integer nearFullPercent, Integer endingWeeks) {
        List<Map<String, String>> errors = new ArrayList<>();
        boolean benchOk = checkRange(errors, "benchPercent", benchPercent, 1, 99);
        boolean nearFullOk = checkRange(errors, "nearFullPercent", nearFullPercent, 2, 100);
        checkRange(errors, "endingWeeks", endingWeeks, 1, MAX_ENDING_WEEKS);
        if (benchOk && nearFullOk && benchPercent >= nearFullPercent) {
            errors.add(Map.of("field", "benchPercent", "code", "not_below_near_full"));
        }
        return errors;
    }

    private static boolean checkRange(List<Map<String, String>> errors, String field, Integer value, int min,
            int max) {
        if (value == null) {
            errors.add(Map.of("field", field, "code", "required"));
            return false;
        }
        if (value < min || value > max) {
            errors.add(Map.of("field", field, "code", "out_of_range"));
            return false;
        }
        return true;
    }
}
