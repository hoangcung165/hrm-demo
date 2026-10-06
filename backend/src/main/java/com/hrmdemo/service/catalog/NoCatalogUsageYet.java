package com.hrmdemo.service.catalog;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.catalog.Catalog;
import org.springframework.stereotype.Component;

/** Stand-in until the first feature refers to catalog items (HRM-06): nothing is in use. */
@Component
class NoCatalogUsageYet implements CatalogUsage {

    @Override
    public Set<UUID> inUse(Catalog catalog, Collection<UUID> itemIds) {
        return Set.of();
    }
}
