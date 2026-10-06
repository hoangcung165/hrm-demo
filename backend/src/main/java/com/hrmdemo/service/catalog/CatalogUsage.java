package com.hrmdemo.service.catalog;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.catalog.Catalog;

/**
 * Which catalog items other records refer to. An item in use can be deactivated but not deleted. Until
 * HRM-06 nothing refers to a catalog item ({@link NoCatalogUsageYet}); the features that do (employees,
 * contracts, allowances, skills, allocations) replace that bean with one that asks each of them.
 */
public interface CatalogUsage {

    /** The items among {@code itemIds} that some record refers to. */
    Set<UUID> inUse(Catalog catalog, Collection<UUID> itemIds);
}
