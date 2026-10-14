package com.hrmdemo.service.resource;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import com.hrmdemo.service.allocation.AllocationCalculator.Granularity;

/**
 * The columns of the heatmap: {@code count} whole weeks (Monday to Sunday) or calendar months, the first one the week
 * or month that contains the requested day.
 *
 * @param from first day of the first column
 * @param to   last day of the last column
 */
public record HeatmapWindow(Granularity granularity, LocalDate from, LocalDate to, int count) {

    public static final int DEFAULT_WEEKS = 12;
    public static final int DEFAULT_MONTHS = 6;
    public static final int MAX_COUNT = 12;

    /** A column of the window. */
    public record Column(LocalDate from, LocalDate to) {
    }

    /** @param day any day of the first column */
    public static HeatmapWindow of(Granularity granularity, LocalDate day, int count) {
        if (count < 1 || count > MAX_COUNT) {
            throw new IllegalArgumentException("A heatmap has 1 to " + MAX_COUNT + " columns, not " + count);
        }
        return switch (granularity) {
            case WEEK -> {
                LocalDate from = day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                yield new HeatmapWindow(granularity, from, from.plusWeeks(count).minusDays(1), count);
            }
            case MONTH -> {
                LocalDate from = day.withDayOfMonth(1);
                yield new HeatmapWindow(granularity, from, from.plusMonths(count).minusDays(1), count);
            }
        };
    }

    public static int defaultCount(Granularity granularity) {
        return granularity == Granularity.WEEK ? DEFAULT_WEEKS : DEFAULT_MONTHS;
    }

    /** The columns, first to last. */
    public List<Column> columns() {
        return java.util.stream.IntStream.range(0, count).mapToObj(i -> switch (granularity) {
            case WEEK -> new Column(from.plusWeeks(i), from.plusWeeks(i + 1).minusDays(1));
            case MONTH -> new Column(from.plusMonths(i), from.plusMonths(i + 1).minusDays(1));
        }).toList();
    }

    /** The Monday of the week that contains {@code day}. */
    public static LocalDate weekStart(LocalDate day) {
        return day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }
}
