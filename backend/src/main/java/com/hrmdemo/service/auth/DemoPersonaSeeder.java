package com.hrmdemo.service.auth;

import java.time.Clock;
import java.util.Optional;

import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.DemoPersona;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.service.legalentity.LegalEntityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the demo persona Accounts, one per role, when {@code hrm.demo-personas.enabled}
 * ({@code HRM_DEMO_PERSONAS}) is true; the bean does not exist otherwise. Independent of the example data.
 * <p>
 * Only missing personas are created. An existing one is left exactly as it is, also when it is locked: an
 * Admin's lock survives a restart, and personas locked while the flag was off stay locked until an Admin
 * unlocks them. The password is random and thrown away, so a persona never signs in with a password.
 */
@Slf4j
@Component
@Order(DemoPersonaSeeder.AFTER_THE_ADMIN)
@ConditionalOnProperty(name = "hrm.demo-personas.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DemoPersonaSeeder implements ApplicationRunner {

    /** Startup order of the persona beans; {@link AdminAccountSeeder} runs first. */
    static final int AFTER_THE_ADMIN = 2;

    private final AccountRepository accounts;
    private final LegalEntityService legalEntityService;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        log.warn("Demo personas are ON (hrm.demo-personas.enabled): any signed-in Account can act as a demo "
                + "persona, the Admin persona included. Never turn this on for a database with real data.");
        // Two instances starting together: the second waits here, then sees the personas of the first.
        legalEntityService.lockForStructureChange();
        int created = 0;
        for (DemoPersona persona : DemoPersona.values()) {
            if (accounts.findByDemoPersona(persona).isPresent()) {
                continue;
            }
            Optional<Account> emailHolder = accounts.findByEmail(persona.email());
            if (emailHolder.isPresent()) {
                log.warn("Demo persona {} not created: its email is used by Account {}", persona,
                        emailHolder.get().getId());
                continue;
            }
            accounts.save(Account.forDemoPersona(persona, passwordEncoder.encode(OpaqueToken.generate()),
                    clock.instant()));
            created++;
        }
        log.info("Demo personas: {} created, {} already there or skipped", created,
                DemoPersona.values().length - created);
    }
}
