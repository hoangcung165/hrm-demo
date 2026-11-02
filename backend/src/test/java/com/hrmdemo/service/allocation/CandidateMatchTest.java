package com.hrmdemo.service.allocation;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.service.allocation.CandidateMatch.Match;
import com.hrmdemo.service.allocation.CandidateMatch.Ranking;
import com.hrmdemo.service.allocation.CandidateMatch.Requirement;
import com.hrmdemo.service.allocation.CandidateMatch.Sort;
import org.junit.jupiter.api.Test;

/** Tìm người: the match count, % còn trống and the order of results, on the people of the #16 artboards. */
class CandidateMatchTest {

    static final UUID REACT = UUID.randomUUID();
    static final UUID TYPESCRIPT = UUID.randomUUID();
    static final List<Requirement> REQUIRED = List.of(new Requirement(REACT, 3), new Requirement(TYPESCRIPT, 3));

    @Test
    void aSkillIsMetAtTheMinimumLevelAndAbove() {
        assertThat(match(Map.of(REACT, 3, TYPESCRIPT, 5)).matched()).isEqualTo(2);
        assertThat(match(Map.of(REACT, 3, TYPESCRIPT, 3)).matched()).isEqualTo(2);
    }

    @Test
    void aSkillBelowTheMinimumLevelIsKeptWithItsLevelButNotCounted() {
        Match match = match(Map.of(REACT, 5, TYPESCRIPT, 2));

        assertThat(match.matched()).isEqualTo(1);
        assertThat(match.required()).isEqualTo(2);
        assertThat(match.skills().get(1).level()).isEqualTo(2);
        assertThat(match.skills().get(1).met()).isFalse();
    }

    @Test
    void aSkillTheEmployeeDoesNotHaveHasNoLevelAndIsNotMet() {
        Match match = match(Map.of(TYPESCRIPT, 4));

        assertThat(match.matched()).isEqualTo(1);
        assertThat(match.skills().get(0).level()).isNull();
        assertThat(match.skills().get(0).met()).isFalse();
    }

    @Test
    void anEmployeeWithNoRequiredSkillMeetsNone() {
        assertThat(match(Map.of(UUID.randomUUID(), 5)).matched()).isZero();
    }

    @Test
    void theResultKeepsTheOrderTheSkillsWereAskedFor() {
        assertThat(match(Map.of()).skills()).extracting(CandidateMatch.SkillResult::skillId)
                .containsExactly(REACT, TYPESCRIPT);
    }

    @Test
    void freePercentIs100MinusThePeakAndNeverBelowZero() {
        assertThat(CandidateMatch.freePercent(0)).isEqualTo(100);
        assertThat(CandidateMatch.freePercent(80)).isEqualTo(20);
        assertThat(CandidateMatch.freePercent(100)).isZero();
        assertThat(CandidateMatch.freePercent(110)).isZero();
    }

    @Test
    void overloadedMeansAbove100PercentOnSomeDay() {
        assertThat(CandidateMatch.overloaded(100)).isFalse();
        assertThat(CandidateMatch.overloaded(101)).isTrue();
    }

    @Test
    void byMatchMoreSkillsComeFirstThenMoreFreeThenName() {
        List<Ranking> sorted = List.of(
                new Ranking(1, 100, "An"),
                new Ranking(2, 20, "Bình"),
                new Ranking(2, 70, "Cường"),
                new Ranking(2, 70, "Chi"),
                new Ranking(1, 30, "Dũng"))
                .stream().sorted(CandidateMatch.order(Sort.MATCH)).toList();

        assertThat(sorted).extracting(Ranking::name).containsExactly("Chi", "Cường", "Bình", "An", "Dũng");
    }

    @Test
    void byFreeMoreFreeComesFirstThenMoreSkillsThenName() {
        List<Ranking> sorted = List.of(
                new Ranking(2, 20, "Bình"),
                new Ranking(1, 100, "An"),
                new Ranking(2, 100, "Cường"),
                new Ranking(1, 100, "Ân"))
                .stream().sorted(CandidateMatch.order(Sort.FREE)).toList();

        assertThat(sorted).extracting(Ranking::name).containsExactly("Cường", "An", "Ân", "Bình");
    }

    @Test
    void namesAreOrderedAsVietnameseWordsAre() {
        List<Ranking> sorted = List.of(
                new Ranking(1, 50, "Đoàn Minh Tuấn"),
                new Ranking(1, 50, "Dương Thị Hạnh"),
                new Ranking(1, 50, "Cao Minh Trí"),
                new Ranking(1, 50, "Hà Quang Minh"))
                .stream().sorted(CandidateMatch.order(Sort.MATCH)).toList();

        assertThat(sorted).extracting(Ranking::name)
                .containsExactly("Cao Minh Trí", "Dương Thị Hạnh", "Đoàn Minh Tuấn", "Hà Quang Minh");
    }

    private static Match match(Map<UUID, Integer> levels) {
        return CandidateMatch.match(REQUIRED, levels);
    }
}
