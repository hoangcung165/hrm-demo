package com.hrmdemo.service.allocation;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Bộ tính phân bổ (PRD deep module 4): turns Phân bổ into Tải phân bổ.
 * <p>
 * An Employee's load is a run of periods. The timeline is split on every day an allocation of theirs starts or the
 * day after one ends, so within a period the same allocations cover every day and the load is their sum. Above 100%
 * is Quá tải. The load is planned: leave and holidays do not lower it (Utilization is computed elsewhere).
 * <p>
 * Pure: no storage, no clock. Callers pass the allocations and the dates to look at.
 */
public final class AllocationCalculator {

    /** How {@link #buckets} groups days. */
    public enum Granularity {
        /** ISO weeks, Monday to Sunday. */
        WEEK,
        /** Calendar months. */
        MONTH
    }

    /**
     * One week or month of an Employee's load: the highest load on any day of it, so an overload of one day shows.
     *
     * @param from first day of the bucket, clipped to the window
     * @param to last day of the bucket, clipped to the window
     */
    public record Bucket(LocalDate from, LocalDate to, int peakPercent) {

        public boolean overloaded() {
            return peakPercent > 100;
        }
    }

    /** The load of one Employee within {@code [from, to]}. */
    public EmployeeLoad load(UUID employeeId, Collection<PlannedAllocation> allocations, LocalDate from,
            LocalDate to) {
        Objects.requireNonNull(employeeId, "employeeId");
        checkWindow(from, to);
        List<PlannedAllocation> own = allocations.stream()
                .filter(a -> a.employeeId().equals(employeeId) && a.overlaps(from, to))
                .sorted(Comparator.comparing(PlannedAllocation::from).thenComparing(a -> a.id().toString()))
                .toList();
        return new EmployeeLoad(employeeId, periods(own, from, to));
    }

    /** The load of every Employee who has an allocation within {@code [from, to]}, in order of first appearance. */
    public Map<UUID, EmployeeLoad> loads(Collection<PlannedAllocation> allocations, LocalDate from, LocalDate to) {
        checkWindow(from, to);
        Map<UUID, List<PlannedAllocation>> byEmployee = allocations.stream()
                .filter(a -> a.overlaps(from, to))
                .collect(Collectors.groupingBy(PlannedAllocation::employeeId, LinkedHashMap::new, Collectors.toList()));
        Map<UUID, EmployeeLoad> result = new LinkedHashMap<>();
        byEmployee.forEach((employeeId, own) -> result.put(employeeId, load(employeeId, own, from, to)));
        return result;
    }

    /**
     * Thử phân bổ: the load of {@code candidate}'s Employee if it were saved. An existing allocation with the
     * candidate's id is replaced, so editing an allocation is checked without counting it twice.
     *
     * @param windowFrom first day of the load to return (the overload check always covers the candidate's range)
     * @param windowTo last day of the load to return
     */
    public TryAllocationResult tryAllocation(Collection<PlannedAllocation> existing, PlannedAllocation candidate,
            LocalDate windowFrom, LocalDate windowTo) {
        Objects.requireNonNull(candidate, "candidate");
        checkWindow(windowFrom, windowTo);
        List<PlannedAllocation> others = existing.stream()
                .filter(a -> a.employeeId().equals(candidate.employeeId()) && !a.id().equals(candidate.id()))
                .toList();
        List<PlannedAllocation> withCandidate = new ArrayList<>(others);
        withCandidate.add(candidate);

        LocalDate from = earlier(windowFrom, candidate.from());
        LocalDate to = later(windowTo, candidate.to());
        EmployeeLoad all = load(candidate.employeeId(), withCandidate, from, to);
        EmployeeLoad inRange = all.within(candidate.from(), candidate.to());
        List<LoadPeriod> overloaded = inRange.overloadedPeriods();

        OptionalInt maxPercent = OptionalInt.empty();
        Optional<LocalDate> start = Optional.empty();
        if (!overloaded.isEmpty()) {
            EmployeeLoad othersInRange = load(candidate.employeeId(), others, candidate.from(), candidate.to());
            int room = 100 - othersInRange.peak();
            if (room >= 1) {
                maxPercent = OptionalInt.of(room);
            }
            LocalDate lastOverloaded = overloaded.get(overloaded.size() - 1).to();
            if (lastOverloaded.isBefore(candidate.to())) {
                start = Optional.of(lastOverloaded.plusDays(1));
            }
        }
        return new TryAllocationResult(all.within(windowFrom, windowTo), inRange.peak(), overloaded, maxPercent,
                start);
    }

    /**
     * The load by week or month within {@code [from, to]}: one bucket per week or month the window touches, empty
     * ones at 0, so a heatmap row has a cell for every column.
     */
    public List<Bucket> buckets(EmployeeLoad load, Granularity granularity, LocalDate from, LocalDate to) {
        Objects.requireNonNull(load, "load");
        Objects.requireNonNull(granularity, "granularity");
        checkWindow(from, to);
        List<Bucket> result = new ArrayList<>();
        LocalDate start = from;
        while (!start.isAfter(to)) {
            LocalDate end = switch (granularity) {
                case WEEK -> start.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
                case MONTH -> start.with(TemporalAdjusters.lastDayOfMonth());
            };
            if (end.isAfter(to)) {
                end = to;
            }
            result.add(new Bucket(start, end, load.within(start, end).peak()));
            start = end.plusDays(1);
        }
        return result;
    }

    private static List<LoadPeriod> periods(List<PlannedAllocation> own, LocalDate from, LocalDate to) {
        // Every day the set of covering allocations can change: a start, or the day after an end.
        TreeSet<LocalDate> cuts = new TreeSet<>();
        cuts.add(from);
        cuts.add(to.plusDays(1));
        for (PlannedAllocation a : own) {
            if (a.from().isAfter(from)) {
                cuts.add(a.from());
            }
            if (a.to().isBefore(to)) {
                cuts.add(a.to().plusDays(1));
            }
        }
        List<LoadPeriod> periods = new ArrayList<>();
        LocalDate start = null;
        for (LocalDate cut : cuts) {
            if (start != null) {
                LocalDate day = start;
                List<LoadPeriod.Part> parts = own.stream()
                        .filter(a -> a.covers(day))
                        .map(a -> new LoadPeriod.Part(a.id(), a.projectId(), a.percent()))
                        .toList();
                if (!parts.isEmpty()) {
                    int total = parts.stream().mapToInt(LoadPeriod.Part::percent).sum();
                    periods.add(new LoadPeriod(start, cut.minusDays(1), total, parts));
                }
            }
            start = cut;
        }
        return periods;
    }

    private static void checkWindow(LocalDate from, LocalDate to) {
        Objects.requireNonNull(from, "from");
        Objects.requireNonNull(to, "to");
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("A window ends on or after its start");
        }
    }

    private static LocalDate earlier(LocalDate a, LocalDate b) {
        return a.isBefore(b) ? a : b;
    }

    private static LocalDate later(LocalDate a, LocalDate b) {
        return a.isAfter(b) ? a : b;
    }
}
