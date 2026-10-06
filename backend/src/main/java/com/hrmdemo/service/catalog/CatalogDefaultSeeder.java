package com.hrmdemo.service.catalog;

import java.time.Clock;

import com.hrmdemo.entity.catalog.CatalogDefaultSeed;
import com.hrmdemo.repository.catalog.CatalogDefaultSeedRepository;
import com.hrmdemo.service.catalog.CatalogDefaults.DefaultSet;
import com.hrmdemo.service.legalentity.LegalEntityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Gives the company every set of {@link CatalogDefaults} it has not received yet, at startup. A set is recorded
 * once seeded and never seeded again, so a default the company deleted or renamed does not come back; a release
 * that adds a set (next year's holidays) seeds just that one. Within a set, an item whose code, name or dates the
 * company already uses is skipped.
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class CatalogDefaultSeeder implements ApplicationRunner {

    private final CatalogService catalogService;
    private final CatalogDefaultSeedRepository seeds;
    private final LegalEntityService legalEntityService;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Two instances starting together: the second waits here, then finds the sets of the first.
        legalEntityService.lockForStructureChange();
        for (DefaultSet set : CatalogDefaults.SETS) {
            if (seeds.existsBySeedSet(set.key())) {
                continue;
            }
            int added = catalogService.addDefaultsAsSystem(set.catalog(), set.items());
            seeds.save(new CatalogDefaultSeed(set.key(), clock.instant()));
            log.info("Seeded catalog defaults '{}': {} of {} items", set.key(), added, set.items().size());
        }
    }
}
