package com.hrmdemo.service.allocation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.service.allocation.AllocationCalculator.Bucket;
import com.hrmdemo.service.allocation.AllocationCalculator.Granularity;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

/**
 * Bộ tính phân bổ: the cases HRM-15 lists (overlap, exactly 100%, above 100%, starting or ending mid-period, try
 * allocation), on the people and projects of the approved #15 artboards.
 */
class AllocationCalculatorTest {

    static final UUID TRI = id("tri");
    static final UUID DUY = id("duy");
    static final UUID HANH = id("hanh");

    /** Ứng dụng đặt lịch khám. */
    static final UUID DA031 = id("da-031");
    /** Cổng khách hàng bảo hiểm. */
    static final UUID DA029 = id("da-029");
    /** Hệ thống bán hàng tại quầy. */
    static final UUID DA027 = id("da-027");

    final AllocationCalculator calculator = new AllocationCalculator();

    static UUID id(String name) {
        return UUID.nameUUIDFromBytes(name.getBytes());
    }

    static LocalDate d(int day, int month, int year) {
        return LocalDate.of(year, month, day);
    }

    static PlannedAllocation alloc(String id, UUID employee, UUID project, int percent, LocalDate from,
            LocalDate to) {
        return new PlannedAllocation(id(id), employee, project, percent, from, to);
    }

    /** Trí: 60% on DA-029 until 31/10, 60% on DA-031 from 14/10 to 31/12. */
    final PlannedAllocation triOn029 = alloc("tri-029", TRI, DA029, 60, d(15, 6, 2026), d(31, 10, 2026));
    final PlannedAllocation triOn031 = alloc("tri-031", TRI, DA031, 60, d(14, 10, 2026), d(31, 12, 2026));

    @Nested
    class Load {

        @Test
        void sums_overlapping_allocations_per_period_and_splits_where_one_starts_or_ends() {
            EmployeeLoad load = calculator.load(TRI, List.of(triOn029, triOn031), d(1, 10, 2026), d(31, 12, 2026));

            assertThat(load.periods()).extracting(LoadPeriod::from, LoadPeriod::to, LoadPeriod::totalPercent)
                    .containsExactly(
                            tuple(d(1, 10, 2026), d(13, 10, 2026), 60),
                            tuple(d(14, 10, 2026), d(31, 10, 2026), 120),
                            tuple(d(1, 11, 2026), d(31, 12, 2026), 60));
            assertThat(load.periods().get(1).parts()).extracting(LoadPeriod.Part::projectId)
                    .containsExactly(DA029, DA031);
            assertThat(load.peak()).isEqualTo(120);
            assertThat(load.overloadedPeriods()).singleElement()
                    .satisfies(p -> assertThat(p.from()).isEqualTo(d(14, 10, 2026)));
        }

        @Test
        void does_not_add_allocations_that_do_not_overlap() {
            PlannedAllocation first = alloc("a", DUY, DA027, 80, d(1, 9, 2026), d(30, 9, 2026));
            PlannedAllocation second = alloc("b", DUY, DA031, 80, d(1, 10, 2026), d(31, 10, 2026));

            EmployeeLoad load = calculator.load(DUY, List.of(first, second), d(1, 9, 2026), d(31, 10, 2026));

            assertThat(load.periods()).extracting(LoadPeriod::totalPercent).containsExactly(80, 80);
            assertThat(load.overloaded()).isFalse();
        }

        @Test
        void exactly_100_percent_is_not_overloaded_but_101_is() {
            PlannedAllocation sixty = alloc("a", DUY, DA027, 60, d(1, 10, 2026), d(31, 10, 2026));
            PlannedAllocation forty = alloc("b", DUY, DA031, 40, d(1, 10, 2026), d(31, 10, 2026));
            PlannedAllocation fortyOne = alloc("c", DUY, DA031, 41, d(1, 10, 2026), d(31, 10, 2026));

            EmployeeLoad full = calculator.load(DUY, List.of(sixty, forty), d(1, 10, 2026), d(31, 10, 2026));
            EmployeeLoad over = calculator.load(DUY, List.of(sixty, fortyOne), d(1, 10, 2026), d(31, 10, 2026));

            assertThat(full.peak()).isEqualTo(100);
            assertThat(full.overloaded()).isFalse();
            assertThat(over.peak()).isEqualTo(101);
            assertThat(over.overloaded()).isTrue();
        }

        @Test
        void a_one_day_overlap_is_its_own_period() {
            PlannedAllocation endsOn14 = alloc("a", HANH, DA027, 70, d(1, 10, 2026), d(14, 10, 2026));
            PlannedAllocation startsOn14 = alloc("b", HANH, DA031, 70, d(14, 10, 2026), d(31, 10, 2026));

            EmployeeLoad load = calculator.load(HANH, List.of(endsOn14, startsOn14), d(1, 10, 2026),
                    d(31, 10, 2026));

            assertThat(load.overloadedPeriods()).singleElement().satisfies(p -> {
                assertThat(p.from()).isEqualTo(d(14, 10, 2026));
                assertThat(p.to()).isEqualTo(d(14, 10, 2026));
                assertThat(p.totalPercent()).isEqualTo(140);
            });
        }

        @Test
        void leaves_out_days_without_allocation_and_clips_to_the_window() {
            PlannedAllocation early = alloc("a", HANH, DA027, 50, d(1, 1, 2026), d(10, 10, 2026));
            PlannedAllocation late = alloc("b", HANH, DA031, 40, d(20, 10, 2026), d(31, 3, 2027));

            EmployeeLoad load = calculator.load(HANH, List.of(early, late), d(1, 10, 2026), d(31, 10, 2026));

            assertThat(load.periods()).extracting(LoadPeriod::from, LoadPeriod::to)
                    .containsExactly(
                            tuple(d(1, 10, 2026), d(10, 10, 2026)),
                            tuple(d(20, 10, 2026), d(31, 10, 2026)));
            assertThat(load.on(d(15, 10, 2026))).isZero();
            assertThat(load.on(d(25, 10, 2026))).isEqualTo(40);
        }

        @Test
        void loads_groups_by_employee_and_ignores_allocations_outside_the_window() {
            PlannedAllocation duy = alloc("duy", DUY, DA027, 30, d(1, 5, 2026), d(30, 11, 2026));
            PlannedAllocation past = alloc("hanh-past", HANH, DA027, 50, d(1, 1, 2026), d(30, 6, 2026));

            Map<UUID, EmployeeLoad> loads = calculator.loads(List.of(triOn029, triOn031, duy, past),
                    d(1, 10, 2026), d(31, 10, 2026));

            assertThat(loads).containsOnlyKeys(TRI, DUY);
            assertThat(loads.get(TRI).peak()).isEqualTo(120);
            assertThat(loads.get(DUY).peak()).isEqualTo(30);
        }

        @Test
        void another_employee_never_adds_to_the_load() {
            PlannedAllocation duy = alloc("duy", DUY, DA031, 100, d(1, 10, 2026), d(31, 10, 2026));

            EmployeeLoad load = calculator.load(TRI, List.of(triOn029, duy), d(1, 10, 2026), d(31, 10, 2026));

            assertThat(load.peak()).isEqualTo(60);
        }

        @Test
        void refuses_a_window_that_ends_before_it_starts() {
            assertThatThrownBy(() -> calculator.load(TRI, List.of(), d(2, 10, 2026), d(1, 10, 2026)))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    class TryAllocation {

        @Test
        void a_new_allocation_that_overloads_names_the_period_the_projects_and_both_fixes() {
            TryAllocationResult result = calculator.tryAllocation(List.of(triOn029), triOn031, d(1, 10, 2026),
                    d(31, 12, 2026));

            assertThat(result.overloaded()).isTrue();
            assertThat(result.peak()).isEqualTo(120);
            assertThat(result.overloadedPeriods()).singleElement().satisfies(p -> {
                assertThat(p.from()).isEqualTo(d(14, 10, 2026));
                assertThat(p.to()).isEqualTo(d(31, 10, 2026));
                assertThat(p.parts()).extracting(LoadPeriod.Part::projectId, LoadPeriod.Part::percent)
                        .containsExactly(tuple(DA029, 60),
                                tuple(DA031, 60));
            });
            assertThat(result.suggestedMaxPercent()).hasValue(40);
            assertThat(result.suggestedStart()).contains(d(1, 11, 2026));
            // The window shows the load before the new allocation starts too, as the dialog does.
            assertThat(result.load().periods()).extracting(LoadPeriod::totalPercent).containsExactly(60, 120, 60);
        }

        @Test
        void a_new_allocation_that_fits_reports_the_peak_and_no_fixes() {
            PlannedAllocation duyOn027 = alloc("duy-027", DUY, DA027, 30, d(1, 5, 2026), d(30, 11, 2026));
            PlannedAllocation candidate = alloc("duy-031", DUY, DA031, 50, d(15, 10, 2026), d(31, 3, 2027));

            TryAllocationResult result = calculator.tryAllocation(List.of(duyOn027), candidate, d(15, 10, 2026),
                    d(31, 3, 2027));

            assertThat(result.overloaded()).isFalse();
            assertThat(result.peak()).isEqualTo(80);
            assertThat(result.suggestedMaxPercent()).isEmpty();
            assertThat(result.suggestedStart()).isEmpty();
            assertThat(result.load().periods()).extracting(LoadPeriod::totalPercent).containsExactly(80, 50);
        }

        @Test
        void editing_an_allocation_replaces_it_instead_of_counting_it_twice() {
            PlannedAllocation lowered = alloc("tri-031", TRI, DA031, 40, d(14, 10, 2026), d(31, 12, 2026));

            TryAllocationResult result = calculator.tryAllocation(List.of(triOn029, triOn031), lowered,
                    d(14, 10, 2026), d(31, 12, 2026));

            assertThat(result.overloaded()).isFalse();
            assertThat(result.peak()).isEqualTo(100);
        }

        @Test
        void moving_the_start_past_the_overlap_clears_the_overload() {
            PlannedAllocation moved = alloc("tri-031", TRI, DA031, 60, d(1, 11, 2026), d(31, 12, 2026));

            TryAllocationResult result = calculator.tryAllocation(List.of(triOn029, triOn031), moved,
                    d(1, 11, 2026), d(31, 12, 2026));

            assertThat(result.overloaded()).isFalse();
            assertThat(result.peak()).isEqualTo(60);
        }

        @Test
        void no_percent_fits_when_the_others_already_reach_100_percent() {
            PlannedAllocation full = alloc("full", HANH, DA027, 100, d(1, 10, 2026), d(31, 10, 2026));
            PlannedAllocation candidate = alloc("new", HANH, DA031, 20, d(1, 10, 2026), d(30, 11, 2026));

            TryAllocationResult result = calculator.tryAllocation(List.of(full), candidate, d(1, 10, 2026),
                    d(30, 11, 2026));

            assertThat(result.overloaded()).isTrue();
            assertThat(result.suggestedMaxPercent()).isEmpty();
            assertThat(result.suggestedStart()).contains(d(1, 11, 2026));
        }

        @Test
        void no_start_fits_when_the_overload_runs_to_the_end() {
            PlannedAllocation longer = alloc("long", HANH, DA027, 70, d(1, 10, 2026), d(31, 12, 2026));
            PlannedAllocation candidate = alloc("new", HANH, DA031, 50, d(1, 11, 2026), d(30, 11, 2026));

            TryAllocationResult result = calculator.tryAllocation(List.of(longer), candidate, d(1, 11, 2026),
                    d(30, 11, 2026));

            assertThat(result.overloaded()).isTrue();
            assertThat(result.suggestedMaxPercent()).hasValue(30);
            assertThat(result.suggestedStart()).isEmpty();
        }

        @Test
        void the_fix_suggestion_uses_the_highest_load_of_the_others_in_the_range() {
            // Others: 30% all month, plus 50% from 10/10 to 20/10 → 80% at most, so 20% is the most that fits.
            PlannedAllocation base = alloc("base", HANH, DA027, 30, d(1, 10, 2026), d(31, 10, 2026));
            PlannedAllocation bump = alloc("bump", HANH, DA029, 50, d(10, 10, 2026), d(20, 10, 2026));
            PlannedAllocation candidate = alloc("new", HANH, DA031, 40, d(1, 10, 2026), d(31, 10, 2026));

            TryAllocationResult result = calculator.tryAllocation(List.of(base, bump), candidate, d(1, 10, 2026),
                    d(31, 10, 2026));

            assertThat(result.peak()).isEqualTo(120);
            assertThat(result.suggestedMaxPercent()).hasValue(20);
            assertThat(result.suggestedStart()).contains(d(21, 10, 2026));
        }
    }

    @Nested
    class Buckets {

        @Test
        void a_week_takes_its_highest_day_so_a_mid_week_overlap_shows() {
            EmployeeLoad load = calculator.load(TRI, List.of(triOn029, triOn031), d(5, 10, 2026), d(1, 11, 2026));

            List<Bucket> weeks = calculator.buckets(load, Granularity.WEEK, d(5, 10, 2026), d(1, 11, 2026));

            // Weeks of 05/10, 12/10 (overlap starts Wednesday 14/10), 19/10, 26/10.
            assertThat(weeks).extracting(Bucket::from, Bucket::peakPercent).containsExactly(
                    tuple(d(5, 10, 2026), 60),
                    tuple(d(12, 10, 2026), 120),
                    tuple(d(19, 10, 2026), 120),
                    tuple(d(26, 10, 2026), 120));
            assertThat(weeks.get(1).overloaded()).isTrue();
        }

        @Test
        void months_are_clipped_to_the_window_and_empty_ones_are_zero() {
            PlannedAllocation mid = alloc("mid", DUY, DA027, 50, d(15, 11, 2026), d(10, 12, 2026));
            EmployeeLoad load = calculator.load(DUY, List.of(mid), d(20, 10, 2026), d(15, 1, 2027));

            List<Bucket> months = calculator.buckets(load, Granularity.MONTH, d(20, 10, 2026), d(15, 1, 2027));

            assertThat(months).extracting(Bucket::from, Bucket::to, Bucket::peakPercent).containsExactly(
                    tuple(d(20, 10, 2026), d(31, 10, 2026), 0),
                    tuple(d(1, 11, 2026), d(30, 11, 2026), 50),
                    tuple(d(1, 12, 2026), d(31, 12, 2026), 50),
                    tuple(d(1, 1, 2027), d(15, 1, 2027), 0));
        }
    }

    @Nested
    class PlannedAllocationRules {

        @Test
        void percent_is_1_to_100() {
            assertThatThrownBy(() -> alloc("x", TRI, DA031, 0, d(1, 10, 2026), d(2, 10, 2026)))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> alloc("x", TRI, DA031, 101, d(1, 10, 2026), d(2, 10, 2026)))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void ends_on_or_after_its_start() {
            assertThatThrownBy(() -> alloc("x", TRI, DA031, 50, d(2, 10, 2026), d(1, 10, 2026)))
                    .isInstanceOf(IllegalArgumentException.class);
            assertThat(alloc("x", TRI, DA031, 50, d(1, 10, 2026), d(1, 10, 2026)).percent()).isEqualTo(50);
        }
    }
}
