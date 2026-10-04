package com.hrmdemo.service.auth;

import java.time.Clock;

import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.repository.auth.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Creates the first Admin Account when the account table is empty, from
 * {@code HRM_ADMIN_EMAIL} / {@code HRM_ADMIN_PASSWORD}. Does nothing once any Account exists.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminAccountSeeder implements ApplicationRunner {

    private final AccountRepository accounts;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    @Value("${hrm.admin.email:}")
    private String email;

    @Value("${hrm.admin.password:}")
    private String password;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (accounts.count() > 0) {
            return;
        }
        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            log.warn("No Account exists and HRM_ADMIN_EMAIL / HRM_ADMIN_PASSWORD are not set: nobody can sign in.");
            return;
        }
        Account admin = new Account(AuthService.normalizeEmail(email), passwordEncoder.encode(password),
                clock.instant());
        admin.addRole(Role.ADMIN);
        accounts.save(admin);
        log.info("Seeded Admin Account {}", admin.getEmail());
    }
}
