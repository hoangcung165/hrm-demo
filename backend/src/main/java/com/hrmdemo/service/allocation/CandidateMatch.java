package com.hrmdemo.service.allocation;

import java.text.Collator;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Tìm người (HRM-16): how well an Employee fits the skills a project asks for, and in what order the fits are shown.
 * <p>
 * Match is the number of required skills the Employee has at the minimum level or above. % còn trống is 100 minus
 * the Employee's highest Tải phân bổ in the range (the busiest day decides whether a new allocation fits), never
 * below 0. Leave is not deducted, as for any Tải phân bổ.
 * <p>
 * Pure: no storage, no clock.
 */
public final class CandidateMatch {

    /** How the results are ordered. */
    public enum Sort {
        /** More skills met first, then more % còn trống, then name. */
        MATCH,
        /** More % còn trống first, then more skills met, then name. */
        FREE
    }

    /** A skill the project asks for, from {@code minLevel} (1 to 5) up. */
    public record Requirement(UUID skillId, int minLevel) {
    }

    /**
     * One required skill against what the Employee has.
     *
     * @param level the Employee's level in it, null when they do not have the skill
     */
    public record SkillResult(UUID skillId, Integer level, int minLevel) {

        public boolean met() {
            return level != null && level >= minLevel;
        }
    }

    /** The Employee against every required skill, in the order they were asked for. */
    public record Match(List<SkillResult> skills) {

        public Match {
            skills = List.copyOf(skills);
        }

        /** How many required skills are met. */
        public int matched() {
            return (int) skills.stream().filter(SkillResult::met).count();
        }

        public int required() {
            return skills.size();
        }
    }

    /** What the order looks at in one result. */
    public record Ranking(int matched, int freePercent, String name) {
    }

    private static final Collator VIETNAMESE = collator();

    private CandidateMatch() {
    }

    /** The Employee's levels (skill id to level) against the requirements. */
    public static Match match(List<Requirement> required, Map<UUID, Integer> levels) {
        return new Match(required.stream()
                .map(r -> new SkillResult(r.skillId(), levels.get(r.skillId()), r.minLevel()))
                .toList());
    }

    /** 100 minus the peak load, not below 0. */
    public static int freePercent(int peakLoad) {
        return Math.max(0, 100 - peakLoad);
    }

    /** Above 100% on some day. */
    public static boolean overloaded(int peakLoad) {
        return peakLoad > 100;
    }

    /** The order of results for a sort. */
    public static Comparator<Ranking> order(Sort sort) {
        Comparator<Ranking> byMatch = Comparator.comparingInt(Ranking::matched).reversed();
        Comparator<Ranking> byFree = Comparator.comparingInt(Ranking::freePercent).reversed();
        Comparator<Ranking> byName = Comparator.comparing(Ranking::name, VIETNAMESE);
        return switch (sort) {
            case MATCH -> byMatch.thenComparing(byFree).thenComparing(byName);
            case FREE -> byFree.thenComparing(byMatch).thenComparing(byName);
        };
    }

    private static Collator collator() {
        Collator collator = Collator.getInstance(Locale.forLanguageTag("vi-VN"));
        collator.setStrength(Collator.TERTIARY);
        return collator;
    }
}
