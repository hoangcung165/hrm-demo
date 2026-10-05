package com.hrmdemo.service.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.AccountStatus;
import com.hrmdemo.entity.auth.DemoPersona;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.service.legalentity.LegalEntityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Seeding the demo personas. The stored Accounts are a plain list behind the mocked repository. */
@ExtendWith(MockitoExtension.class)
class DemoPersonaSeederTest {

    static final Instant NOW = Instant.parse("2026-10-05T08:00:00Z");

    @Mock
    AccountRepository accounts;
    @Mock
    LegalEntityService legalEntityService;
    @Mock
    PasswordEncoder passwordEncoder;

    /** What the repository holds. */
    final List<Account> stored = new ArrayList<>();
    /** Every password the seeder asked to hash. */
    final List<String> passwords = new ArrayList<>();

    DemoPersonaSeeder seeder;

    @BeforeEach
    void setUp() {
        seeder = new DemoPersonaSeeder(accounts, legalEntityService, passwordEncoder,
                Clock.fixed(NOW, ZoneOffset.UTC));
        lenient().when(accounts.findByDemoPersona(any())).thenAnswer(call -> stored.stream()
                .filter(account -> account.getDemoPersona() == call.getArgument(0)).findFirst());
        lenient().when(accounts.findByEmail(anyString())).thenAnswer(call -> stored.stream()
                .filter(account -> account.getEmail().equals(call.getArgument(0))).findFirst());
        lenient().when(accounts.save(any(Account.class))).thenAnswer(call -> {
            stored.add(call.getArgument(0));
            return call.getArgument(0);
        });
        lenient().when(passwordEncoder.encode(anyString())).thenAnswer(call -> {
            passwords.add(call.getArgument(0));
            return "hashed:" + call.getArgument(0);
        });
    }

    @Test
    void aFreshDatabaseGetsOneActiveAccountPerPersona() {
        seeder.run(null);

        assertThat(stored).extracting(Account::getDemoPersona).containsExactly(DemoPersona.values());
        assertThat(stored).allSatisfy(account -> {
            DemoPersona persona = account.getDemoPersona();
            assertThat(account.getFullName()).isEqualTo(persona.fullName());
            assertThat(account.getEmail()).isEqualTo(persona.email());
            assertThat(account.getStatus()).isEqualTo(AccountStatus.ACTIVE);
            assertThat(account.getCreatedAt()).isEqualTo(NOW);
            assertThat(account.getEmployeeId()).isNull();
            assertThat(account.roleNames())
                    .containsExactlyInAnyOrderElementsOf(persona.roles().stream().map(Role::name).toList());
        });
    }

    @Test
    void everyPersonaGetsItsOwnLongRandomPasswordThatNobodyKnows() {
        seeder.run(null);

        assertThat(passwords).hasSize(7).doesNotHaveDuplicates()
                .allSatisfy(password -> assertThat(password.length()).isBetween(40, 72));
        assertThat(stored).extracting(Account::getPasswordHash)
                .containsExactlyElementsOf(passwords.stream().map(password -> "hashed:" + password).toList());
    }

    @Test
    void theCompanyWideLockIsTakenBeforeThePersonasAreLookedUp() {
        seeder.run(null);

        InOrder order = inOrder(legalEntityService, accounts);
        order.verify(legalEntityService).lockForStructureChange();
        order.verify(accounts).findByDemoPersona(DemoPersona.ADMIN);
    }

    @Test
    void runningAgainCreatesNothing() {
        seeder.run(null);
        seeder.run(null);

        assertThat(stored).hasSize(7);
        verify(accounts, times(7)).save(any(Account.class));
    }

    @Test
    void onlyTheMissingPersonasAreCreated() {
        stored.add(Account.forDemoPersona(DemoPersona.HR, "old-hash", Instant.EPOCH));
        stored.add(Account.forDemoPersona(DemoPersona.DIRECTOR, "old-hash", Instant.EPOCH));

        seeder.run(null);

        assertThat(stored).extracting(Account::getDemoPersona)
                .containsExactlyInAnyOrder(DemoPersona.values());
        verify(accounts, times(5)).save(any(Account.class));
        assertThat(stored.get(0).getPasswordHash()).as("the existing persona is untouched").isEqualTo("old-hash");
    }

    @Test
    void aPersonaAnAdminLockedStaysLocked() {
        Account lockedHr = Account.forDemoPersona(DemoPersona.HR, "old-hash", Instant.EPOCH);
        lockedHr.lock();
        stored.add(lockedHr);

        seeder.run(null);

        assertThat(lockedHr.getStatus()).isEqualTo(AccountStatus.LOCKED);
        assertThat(stored).hasSize(7);
    }

    @Test
    void aPersonaWhoseEmailAnOrdinaryAccountHoldsIsSkippedAndTheRestAreCreated() {
        stored.add(new Account(DemoPersona.HR.email(), "Someone Real", "their-hash", Instant.EPOCH));

        seeder.run(null);

        assertThat(stored).extracting(Account::getDemoPersona).doesNotContain(DemoPersona.HR);
        assertThat(stored).hasSize(7);
        assertThat(stored.get(0).isDemoPersona()).as("the ordinary Account is not turned into a persona").isFalse();
        verify(accounts, times(6)).save(any(Account.class));
    }
}
