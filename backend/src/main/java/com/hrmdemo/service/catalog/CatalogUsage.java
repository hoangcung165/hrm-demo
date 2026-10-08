package com.hrmdemo.service.catalog;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.catalog.Catalog;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Which catalog items other records refer to, from every {@link CatalogReferences} bean. An item in use can be
 * deactivated but not deleted. Employees refer to positions; contracts, allowances, skills and allocations add
 * their own beans later.
 */
@Component
@RequiredArgsConstructor
public class CatalogUsage {

    private final List<CatalogReferences> references;

    /** The items among {@code itemIds} that some record refers to. */
    public Set<UUID> inUse(Catalog catalog, Collection<UUID> itemIds) {
        Set<UUID> used = new HashSet<>();
        if (itemIds.isEmpty()) {
            return used;
        }
        for (CatalogReferences feature : references) {
            if (feature.catalog() == catalog) {
                used.addAll(feature.referenced(itemIds));
            }
        }
        return used;
    }
}
