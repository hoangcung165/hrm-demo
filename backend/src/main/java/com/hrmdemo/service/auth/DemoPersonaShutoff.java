package com.hrmdemo.service.auth;

import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.repository.auth.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * The other side of {@link DemoPersonaSeeder}: when {@code hrm.demo-personas.enabled} is off (the default),
 * persona Accounts left in the database by an earlier run are locked at startup and their sessions ended,
 * so turning the flag off really takes the personas away. Turning it on again does not unlock them.
 */
@Slf4j
@Component
@Order(DemoPersonaSeeder.AFTER_THE_ADMIN)
@ConditionalOnProperty(name = "hrm.demo-personas.enabled", havingValue = "false", matchIfMissing = true)
@RequiredArgsConstructor
public class DemoPersonaShutoff implements ApplicationRunner {

    private final AccountRepository accounts;
    private final TokenService tokenService;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (Account account : accounts.findByDemoPersonaIsNotNull()) {
            if (account.isActive()) {
                account.lock();
                tokenService.revokeAll(account.getId());
                log.warn("Demo personas are off: locked persona Account {} ({})", account.getId(),
                        account.getDemoPersona());
            }
        }
    }
}
