package com.hrmdemo.service.catalog;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.entity.catalog.Catalog;

/**
 * One feature's references to the items of one catalog, e.g. Employees to positions. Each feature that refers to
 * catalog items adds a bean; {@link CatalogUsage} asks all of them.
 */
public interface CatalogReferences {

    /** The catalog whose items this feature refers to. */
    Catalog catalog();

    /** The items among {@code itemIds} that some record of this feature refers to, whatever that record's status. */
    Set<UUID> referenced(Collection<UUID> itemIds);
}
