package com.hrmdemo.service.orgunit;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.orgunit.OrgUnit;

/**
 * The units of one Legal entity as a tree, built in memory from one load. A snapshot: build a new one
 * after changing a unit's parent. Every walk stops on a repeated unit, so broken data cannot loop forever.
 */
final class OrgTree {

    /** Display order among siblings: sort order, then name, then id to keep it stable. */
    private static final Comparator<OrgUnit> SIBLING_ORDER = Comparator.comparingInt(OrgUnit::getSortOrder)
            .thenComparing(OrgUnit::getName, String.CASE_INSENSITIVE_ORDER)
            .thenComparing(OrgUnit::getId);

    private final Map<UUID, OrgUnit> byId = new LinkedHashMap<>();
    private final List<OrgUnit> topLevel = new ArrayList<>();
    private final Map<UUID, List<OrgUnit>> childrenByParent = new HashMap<>();

    OrgTree(Collection<OrgUnit> units) {
        for (OrgUnit unit : units) {
            byId.put(unit.getId(), unit);
        }
        for (OrgUnit unit : units) {
            if (unit.getParentId() == null) {
                topLevel.add(unit);
            } else {
                childrenByParent.computeIfAbsent(unit.getParentId(), id -> new ArrayList<>()).add(unit);
            }
        }
        topLevel.sort(SIBLING_ORDER);
        childrenByParent.values().forEach(children -> children.sort(SIBLING_ORDER));
    }

    Optional<OrgUnit> find(UUID id) {
        return Optional.ofNullable(byId.get(id));
    }

    /** Direct child units in display order; {@code parentId} null means the units right under the company. */
    List<OrgUnit> childrenOf(UUID parentId) {
        return parentId == null ? topLevel : childrenByParent.getOrDefault(parentId, List.of());
    }

    /** Whether {@code candidateId} is the unit {@code unitId} itself or sits anywhere below it. */
    boolean isSelfOrDescendant(UUID unitId, UUID candidateId) {
        Set<UUID> seen = new HashSet<>();
        UUID current = candidateId;
        while (current != null && seen.add(current)) {
            if (current.equals(unitId)) {
                return true;
            }
            OrgUnit unit = byId.get(current);
            current = unit == null ? null : unit.getParentId();
        }
        return false;
    }

    /** Sort order that puts a new child last under the given parent. */
    int nextSortOrder(UUID parentId) {
        return childrenOf(parentId).stream().mapToInt(OrgUnit::getSortOrder).max().orElse(0) + 1;
    }

    /**
     * Headcount of each unit including every unit below it, from the headcount of each unit alone.
     * Inactive units count like active ones: their Employees are still there.
     */
    Map<UUID, Long> rollUp(Map<UUID, Long> directHeadcounts) {
        Map<UUID, Long> totals = new HashMap<>();
        for (OrgUnit unit : byId.values()) {
            long direct = directHeadcounts.getOrDefault(unit.getId(), 0L);
            if (direct == 0) {
                continue;
            }
            // Add the unit's own people to itself and to every unit above it.
            Set<UUID> seen = new HashSet<>();
            UUID current = unit.getId();
            while (current != null && seen.add(current)) {
                totals.merge(current, direct, Long::sum);
                OrgUnit ancestor = byId.get(current);
                current = ancestor == null ? null : ancestor.getParentId();
            }
        }
        return totals;
    }

    /** Every unit, parents before their children, siblings in display order. */
    List<OrgUnit> inDisplayOrder() {
        List<OrgUnit> ordered = new ArrayList<>(byId.size());
        Set<UUID> seen = new HashSet<>();
        appendSubtrees(topLevel, ordered, seen);
        // Units that cannot be reached from the top (broken data) still show up, at the end.
        for (OrgUnit unit : byId.values()) {
            if (seen.add(unit.getId())) {
                ordered.add(unit);
            }
        }
        return ordered;
    }

    private void appendSubtrees(List<OrgUnit> siblings, List<OrgUnit> ordered, Set<UUID> seen) {
        for (OrgUnit unit : siblings) {
            if (seen.add(unit.getId())) {
                ordered.add(unit);
                appendSubtrees(childrenOf(unit.getId()), ordered, seen);
            }
        }
    }
}
