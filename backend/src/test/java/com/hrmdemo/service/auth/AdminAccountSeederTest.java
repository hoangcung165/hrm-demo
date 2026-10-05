package com.hrmdemo.service.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.repository.auth.AccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

/** The first Admin is seeded while the company has no Account of its own; demo personas do not count. */
class AdminAccountSeederTest {

    static final Instant NOW = Instant.parse("2026-10-05T08:00:00Z");

    final AccountRepository accounts = mock(AccountRepository.class);
    final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    final AdminAccountSeeder seeder = new AdminAccountSeeder(accounts, passwordEncoder,
            Clock.fixed(NOW, ZoneOffset.UTC));

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(seeder, "email", " Admin@HRM.test ");
        ReflectionTestUtils.setField(seeder, "password", "admin-password");
        ReflectionTestUtils.setField(seeder, "fullName", " Quản trị viên ");
        when(passwordEncoder.encode("admin-password")).thenReturn("hash");
    }

    @Test
    void aDatabaseThatHoldsOnlyDemoPersonasStillGetsItsAdmin() {
        // Seven persona Accounts exist; none of them is an Account of the company's own.
        when(accounts.count()).thenReturn(7L);
        when(accounts.countByDemoPersonaIsNull()).thenReturn(0L);

        seeder.run(null);

        ArgumentCaptor<Account> saved = ArgumentCaptor.forClass(Account.class);
        verify(accounts).save(saved.capture());
        assertThat(saved.getValue().getEmail()).isEqualTo("admin@hrm.test");
        assertThat(saved.getValue().getFullName()).isEqualTo("Quản trị viên");
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("hash");
        assertThat(saved.getValue().roleNames()).containsExactly("ADMIN");
        assertThat(saved.getValue().isDemoPersona()).isFalse();
    }

    @Test
    void onceAnOrdinaryAccountExistsNothingIsSeeded() {
        when(accounts.countByDemoPersonaIsNull()).thenReturn(1L);

        seeder.run(null);

        verify(accounts, never()).save(any(Account.class));
    }

    @Test
    void withoutAnEmailOrPasswordNothingIsSeeded() {
        ReflectionTestUtils.setField(seeder, "password", "");

        seeder.run(null);

        verify(accounts, never()).save(any(Account.class));
    }
}
