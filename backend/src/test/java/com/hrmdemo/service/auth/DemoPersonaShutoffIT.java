package com.hrmdemo.service.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.DemoPersona;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * Demo personas are opt-in: with {@code hrm.demo-personas.enabled} off (the default and the test profile)
 * there is no seeder, and persona Accounts left by an earlier run are locked at startup.
 */
@IntegrationTest
class DemoPersonaShutoffIT {

    @Autowired
    ApplicationContext context;
    @Autowired
    DemoPersonaShutoff shutoff;
    @Autowired
    AccountRepository accounts;
    @Autowired
    TokenService tokenService;
    @Autowired
    PasswordEncoder passwordEncoder;
    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    DataSource dataSource;

    @AfterEach
    void removePersonas() {
        new JdbcTemplate(dataSource).update("delete from account where demo_persona is not null");
    }

    @Test
    void withoutTheFlagThereIsNoSeederAndNoPersona() {
        assertThat(context.getBeanNamesForType(DemoPersonaSeeder.class)).isEmpty();
        assertThat(context.getBeanNamesForType(DemoPersonaShutoff.class)).hasSize(1);
        assertThat(accounts.findByDemoPersonaIsNotNull()).isEmpty();
    }

    @Test
    void leftoverPersonasAreLockedAtStartupAndTheirSessionsEnded() {
        // What an earlier run with the flag on left behind: two personas, one of them with a live session.
        UUID hr = accounts.save(Account.forDemoPersona(DemoPersona.HR, passwordEncoder.encode("left-over-1"),
                Instant.now())).getId();
        UUID employee = accounts.save(Account.forDemoPersona(DemoPersona.EMPLOYEE,
                passwordEncoder.encode("left-over-2"), Instant.now())).getId();
        String refreshToken = tokenService.issue(hr);
        long ordinaryLockedBefore = lockedOrdinaryAccounts();

        // What startup does.
        shutoff.run(null);

        assertThat(accounts.findById(hr).orElseThrow().isActive()).isFalse();
        assertThat(accounts.findById(employee).orElseThrow().isActive()).isFalse();
        assertThat(mvc.post().uri("/api/auth/refresh").cookie(new Cookie("refresh_token", refreshToken)))
                .as("the persona's session").hasStatus(401);
        assertThat(lockedOrdinaryAccounts()).as("ordinary Accounts are not touched").isEqualTo(ordinaryLockedBefore);
        // The seeded Admin still signs in.
        assertThat(testAccounts.adminBearer(mvc)).startsWith("Bearer ey");

        // Running again changes nothing.
        shutoff.run(null);
        assertThat(accounts.findByDemoPersonaIsNotNull()).hasSize(2).noneMatch(Account::isActive);
    }

    private long lockedOrdinaryAccounts() {
        return new JdbcTemplate(dataSource).queryForObject(
                "select count(*) from account where demo_persona is null and status = 'LOCKED'", Long.class);
    }
}
