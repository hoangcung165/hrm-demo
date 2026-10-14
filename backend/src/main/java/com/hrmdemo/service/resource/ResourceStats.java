package com.hrmdemo.service.resource;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.OptionalInt;

import com.hrmdemo.service.allocation.PlannedAllocation;
import com.hrmdemo.service.resource.ResourceThresholds.Level;

/**
 * The numbers behind the Nguồn lực dashboard, Bench and Sắp hết dự án, as pure functions of loads and allocations
 * (no storage, no clock): the services read the data, this class decides.
 */
public final class ResourceStats {

    private ResourceStats() {
    }

    /** How many people fall on each level of the heatmap scale. */
    public record LevelCounts(int bench, int partial, int full, int over) {

        public int total() {
            return bench + partial + full + over;
        }
    }

    /**
     * An allocation that ends soon.
     *
     * @param daysLeft  days from today to its last day (0: it ends today)
     * @param loadAfter the Employee's load on the day after it ends, from their other allocations
     * @param next      the allocation of the same Employee that starts after this one ends, earliest first, or null
     */
    public record Ending(PlannedAllocation allocation, int daysLeft, int loadAfter, PlannedAllocation next) {

        /** No load after it and nothing planned: the Employee is about to be free ("Chưa có phân bổ tiếp theo"). */
        public boolean withoutNext() {
            return loadAfter == 0 && next == null;
        }
    }

    /** Whether a highest load is Bench: under the bench threshold (no allocation at all is 0, so Bench too). */
    public static boolean onBench(int peakPercent, ResourceThresholds thresholds) {
        return peakPercent < thresholds.benchPercent();
    }

    /** The people on each level, by their highest load over the period. */
    public static LevelCounts countLevels(Collection<Integer> peaks, ResourceThresholds thresholds) {
        int bench = 0;
        int partial = 0;
        int full = 0;
        int over = 0;
        for (int peak : peaks) {
            Level level = thresholds.levelOf(peak);
            switch (level) {
                case BENCH -> bench++;
                case PARTIAL -> partial++;
                case FULL -> full++;
                case OVER -> over++;
            }
        }
        return new LevelCounts(bench, partial, full, over);
    }

    /**
     * The average Tải phân bổ of the people who have one: loads of 0 are left out, so an empty bench does not drag
     * the number down. Rounded half up; empty when nobody is allocated.
     */
    public static OptionalInt averageAllocated(Collection<Integer> loads) {
        List<Integer> allocated = loads.stream().filter(load -> load > 0).toList();
        if (allocated.isEmpty()) {
            return OptionalInt.empty();
        }
        long sum = allocated.stream().mapToLong(Integer::longValue).sum();
        return OptionalInt.of((int) ((sum * 2 + allocated.size()) / (2L * allocated.size())));
    }

    /**
     * Allocations that end from {@code today} to {@code weeks} weeks later, earliest end first (then Employee, then
     * id). {@code all} holds the Employees' allocations that have not ended before today, so what follows an ending
     * allocation is known.
     */
    public static List<Ending> endingSoon(Collection<PlannedAllocation> all, LocalDate today, int weeks) {
        LocalDate until = today.plusWeeks(weeks);
        return all.stream()
                .filter(a -> !a.to().isBefore(today) && !a.to().isAfter(until))
                .map(a -> {
                    LocalDate after = a.to().plusDays(1);
                    int loadAfter = all.stream()
                            .filter(o -> o.employeeId().equals(a.employeeId()) && !o.from().isAfter(after)
                                    && !o.to().isBefore(after))
                            .mapToInt(PlannedAllocation::percent).sum();
                    PlannedAllocation next = all.stream()
                            .filter(o -> o.employeeId().equals(a.employeeId()) && o.from().isAfter(a.to()))
                            .min(Comparator.comparing(PlannedAllocation::from).thenComparing(PlannedAllocation::id))
                            .orElse(null);
                    return new Ending(a, (int) ChronoUnit.DAYS.between(today, a.to()), loadAfter, next);
                })
                .sorted(Comparator.comparing((Ending e) -> e.allocation().to())
                        .thenComparing(e -> e.allocation().employeeId())
                        .thenComparing(e -> e.allocation().id()))
                .toList();
    }
}
