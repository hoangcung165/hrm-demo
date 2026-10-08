package com.hrmdemo.service.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.entity.catalog.Catalog;
import org.junit.jupiter.api.Test;

/** The usage of catalog items is the union of what every feature refers to, per catalog. */
class CatalogUsageTest {

    static final UUID A = UUID.randomUUID();
    static final UUID B = UUID.randomUUID();
    static final UUID C = UUID.randomUUID();

    @Test
    void anItemIsInUseWhenAnyFeatureOfItsCatalogRefersToIt() {
        CatalogUsage usage = new CatalogUsage(List.of(
                references(Catalog.POSITION, Set.of(A)),
                references(Catalog.POSITION, Set.of(B)),
                references(Catalog.SKILL, Set.of(C))));

        assertThat(usage.inUse(Catalog.POSITION, List.of(A, B, C))).containsExactlyInAnyOrder(A, B);
        assertThat(usage.inUse(Catalog.SKILL, List.of(A, C))).containsExactly(C);
        assertThat(usage.inUse(Catalog.HOLIDAY, List.of(A, B, C))).isEmpty();
        assertThat(usage.inUse(Catalog.POSITION, List.of())).isEmpty();
    }

    @Test
    void withoutAnyFeatureNothingIsInUse() {
        assertThat(new CatalogUsage(List.of()).inUse(Catalog.POSITION, List.of(A))).isEmpty();
    }

    private static CatalogReferences references(Catalog catalog, Set<UUID> referenced) {
        return new CatalogReferences() {
            @Override
            public Catalog catalog() {
                return catalog;
            }

            @Override
            public Set<UUID> referenced(Collection<UUID> itemIds) {
                return itemIds.stream().filter(referenced::contains).collect(Collectors.toSet());
            }
        };
    }
}
