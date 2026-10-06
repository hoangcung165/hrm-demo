package com.hrmdemo.repository.catalog;

import java.util.UUID;

import com.hrmdemo.entity.catalog.CatalogDefaultSeed;
import org.springframework.data.jpa.repository.JpaRepository;

/** The default sets the current Legal entity has received. */
public interface CatalogDefaultSeedRepository extends JpaRepository<CatalogDefaultSeed, UUID> {

    boolean existsBySeedSet(String seedSet);
}
