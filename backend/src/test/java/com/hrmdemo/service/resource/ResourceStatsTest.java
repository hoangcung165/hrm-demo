package com.hrmdemo.service.resource;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import java.util.OptionalInt;
import java.util.UUID;

import com.hrmdemo.service.allocation.PlannedAllocation;
import com.hrmdemo.service.resource.ResourceStats.Ending;
import com.hrmdemo.service.resource.ResourceStats.LevelCounts;
import org.junit.jupiter.api.Test;

class ResourceStatsTest {

    static final LocalDate TODAY = LocalDate.of(2026, 10, 14);
    static final ResourceThresholds DEFAULTS = ResourceThresholds.DEFAULTS;

    final UUID an = UUID.randomUUID();
    final UUID binh = UUID.randomUUID();
    final UUID project = UUID.randomUUID();

    @Test
    void benchIsStrictlyUnderTheThreshold() {
        assertThat(ResourceStats.onBench(0, DEFAULTS)).isTrue();
        assertThat(ResourceStats.onBench(49, DEFAULTS)).isTrue();
        assertThat(ResourceStats.onBench(50, DEFAULTS)).isFalse();
        assertThat(ResourceStats.onBench(50, new ResourceThresholds(60, 90, 4))).isTrue();
    }

    @Test
    void peopleAreCountedOnTheLevelOfTheirLoad() {
        // 0 and 49 bench, 50 and 89 partial, 90 and 100 full, 101 over.
        LevelCounts counts = ResourceStats.countLevels(List.of(0, 49, 50, 89, 90, 100, 101, 130), DEFAULTS);

        assertThat(counts).isEqualTo(new LevelCounts(2, 2, 2, 2));
        assertThat(counts.total()).isEqualTo(8);
        assertThat(ResourceStats.countLevels(List.of(), DEFAULTS).total()).isZero();
    }

    @Test
    void theAverageLoadLeavesOutPeopleWithoutAllocation() {
        // (60 + 100 + 110) / 3 = 90; the two people at 0 do not count.
        assertThat(ResourceStats.averageAllocated(List.of(0, 60, 0, 100, 110))).isEqualTo(OptionalInt.of(90));
        assertThat(ResourceStats.averageAllocated(List.of(0, 0))).isEmpty();
        assertThat(ResourceStats.averageAllocated(List.of())).isEmpty();
    }

    @Test
    void theAverageLoadRoundsHalfUp() {
        // (50 + 61) / 2 = 55.5 -> 56
        assertThat(ResourceStats.averageAllocated(List.of(50, 61))).isEqualTo(OptionalInt.of(56));
        // (50 + 51 + 51) / 3 = 50.67 -> 51
        assertThat(ResourceStats.averageAllocated(List.of(50, 51, 51))).isEqualTo(OptionalInt.of(51));
        // (50 + 50 + 51) / 3 = 50.33 -> 50
        assertThat(ResourceStats.averageAllocated(List.of(50, 50, 51))).isEqualTo(OptionalInt.of(50));
    }

    @Test
    void anAllocationEndingWithinTheWeeksIsEndingSoonEarliestFirst() {
        PlannedAllocation endsIn10 = alloc(an, 100, TODAY.minusDays(60), TODAY.plusDays(10));
        PlannedAllocation endsToday = alloc(binh, 50, TODAY.minusDays(60), TODAY);
        PlannedAllocation endsOnTheLastDay = alloc(an, 20, TODAY.minusDays(5), TODAY.plusWeeks(4));
        PlannedAllocation endsLater = alloc(binh, 30, TODAY.minusDays(5), TODAY.plusWeeks(4).plusDays(1));
        PlannedAllocation endedYesterday = alloc(binh, 30, TODAY.minusDays(50), TODAY.minusDays(1));

        List<Ending> endings = ResourceStats.endingSoon(
                List.of(endsIn10, endsToday, endsOnTheLastDay, endsLater, endedYesterday), TODAY, 4);

        assertThat(endings).extracting(e -> e.allocation().id())
                .containsExactly(endsToday.id(), endsIn10.id(), endsOnTheLastDay.id());
        assertThat(endings).extracting(Ending::daysLeft).containsExactly(0, 10, 28);
    }

    @Test
    void theLoadAfterIsWhatTheOtherAllocationsCoverTheDayAfter() {
        PlannedAllocation ending = alloc(an, 60, TODAY.minusDays(30), TODAY.plusDays(7));
        PlannedAllocation staying = alloc(an, 40, TODAY.minusDays(30), TODAY.plusDays(90));
        PlannedAllocation startsAfterwards = alloc(an, 70, TODAY.plusDays(8), TODAY.plusDays(60));

        Ending e = ResourceStats.endingSoon(List.of(ending, staying, startsAfterwards), TODAY, 4).get(0);

        // 40 stays and 70 starts the day after: 110.
        assertThat(e.loadAfter()).isEqualTo(110);
        assertThat(e.next().id()).isEqualTo(startsAfterwards.id());
        assertThat(e.withoutNext()).isFalse();
    }

    @Test
    void someoneFreeAfterwardsWithNothingPlannedIsWithoutNext() {
        PlannedAllocation ending = alloc(an, 100, TODAY.minusDays(30), TODAY.plusDays(7));

        Ending e = ResourceStats.endingSoon(List.of(ending), TODAY, 4).get(0);

        assertThat(e.loadAfter()).isZero();
        assertThat(e.next()).isNull();
        assertThat(e.withoutNext()).isTrue();
    }

    @Test
    void aGapBeforeTheNextAllocationStillCountsAsAnAllocationPlanned() {
        PlannedAllocation ending = alloc(an, 100, TODAY.minusDays(30), TODAY.plusDays(7));
        PlannedAllocation later = alloc(an, 100, TODAY.plusDays(20), TODAY.plusDays(80));

        Ending e = ResourceStats.endingSoon(List.of(ending, later), TODAY, 4).get(0);

        assertThat(e.loadAfter()).isZero();
        assertThat(e.next().id()).isEqualTo(later.id());
        assertThat(e.withoutNext()).isFalse();
    }

    @Test
    void anotherEmployeesAllocationsDoNotCount() {
        PlannedAllocation ending = alloc(an, 100, TODAY.minusDays(30), TODAY.plusDays(7));
        PlannedAllocation theirs = alloc(binh, 100, TODAY.minusDays(30), TODAY.plusDays(90));

        Ending e = ResourceStats.endingSoon(List.of(ending, theirs), TODAY, 4).get(0);

        assertThat(e.loadAfter()).isZero();
        assertThat(e.withoutNext()).isTrue();
    }

    @Test
    void theEndingSoonWindowFollowsTheWeeksSetting() {
        PlannedAllocation endsIn20 = alloc(an, 100, TODAY.minusDays(30), TODAY.plusDays(20));

        assertThat(ResourceStats.endingSoon(List.of(endsIn20), TODAY, 2)).isEmpty();
        assertThat(ResourceStats.endingSoon(List.of(endsIn20), TODAY, 3)).hasSize(1);
    }

    PlannedAllocation alloc(UUID employee, int percent, LocalDate from, LocalDate to) {
        return new PlannedAllocation(UUID.randomUUID(), employee, project, percent, from, to);
    }
}
