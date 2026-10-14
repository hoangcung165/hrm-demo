package com.hrmdemo.service.resource;

import java.text.Collator;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.service.allocation.AllocationCalculator;
import com.hrmdemo.service.allocation.AllocationCalculator.Bucket;
import com.hrmdemo.service.allocation.EmployeeLoad;
import com.hrmdemo.service.resource.ResourceThresholds.Level;

/**
 * The rows of the resource heatmap, built from the Employees and their loads: one cell per column holding the
 * highest Tải phân bổ of that week or month. Pure: filtering and sorting happen here, so the database is read once
 * for the people and once for the allocations. An Employee without allocations has a row of zeros (Bench).
 */
public final class HeatmapTable {

    /** How the rows are ordered; ties go by name. */
    public enum Sort {
        /** Highest peak first (the default: overloaded people on top). */
        LOAD_DESC,
        /** Lowest peak first. */
        LOAD_ASC,
        /** Name, accents ignored. */
        NAME
    }

    /**
     * @param cells the highest Tải phân bổ of each column
     * @param peak  the highest of the cells
     */
    public record Row(EmployeeCard employee, List<Integer> cells, int peak) {

        public boolean overloaded() {
            return peak > 100;
        }
    }

    private static final Collator VIETNAMESE = Collator.getInstance(Locale.forLanguageTag("vi"));

    private HeatmapTable() {
    }

    /** One row per person, in the order given. People missing from {@code loads} have no allocation. */
    public static List<Row> rows(List<EmployeeCard> people, Map<UUID, EmployeeLoad> loads, HeatmapWindow window) {
        AllocationCalculator calculator = new AllocationCalculator();
        return people.stream().map(person -> {
            EmployeeLoad load = loads.getOrDefault(person.id(), new EmployeeLoad(person.id(), List.of()));
            List<Integer> cells = calculator.buckets(load, window.granularity(), window.from(), window.to()).stream()
                    .map(Bucket::peakPercent).toList();
            return new Row(person, cells, cells.stream().mapToInt(Integer::intValue).max().orElse(0));
        }).toList();
    }

    /** The rows whose peak over the window falls on {@code level}; all rows when {@code level} is null. */
    public static List<Row> onLevel(List<Row> rows, ResourceThresholds thresholds, Level level) {
        if (level == null) {
            return rows;
        }
        return rows.stream().filter(row -> thresholds.levelOf(row.peak()) == level).toList();
    }

    public static List<Row> sorted(List<Row> rows, Sort sort) {
        Comparator<Row> byName = Comparator.comparing((Row row) -> row.employee().fullName(), VIETNAMESE)
                .thenComparing(row -> row.employee().code());
        Comparator<Row> order = switch (sort) {
            case LOAD_DESC -> Comparator.comparingInt(Row::peak).reversed().thenComparing(byName);
            case LOAD_ASC -> Comparator.comparingInt(Row::peak).thenComparing(byName);
            case NAME -> byName;
        };
        return rows.stream().sorted(order).toList();
    }
}
