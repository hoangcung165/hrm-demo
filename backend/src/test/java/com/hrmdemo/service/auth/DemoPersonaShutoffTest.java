package com.hrmdemo.service.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.AccountStatus;
import com.hrmdemo.entity.auth.DemoPersona;
import com.hrmdemo.repository.auth.AccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/** With the demo flag off, persona Accounts left from an earlier run are locked at startup. */
class DemoPersonaShutoffTest {

    final AccountRepository accounts = mock(AccountRepository.class);
    final TokenService tokenService = mock(TokenService.class);
    final DemoPersonaShutoff shutoff = new DemoPersonaShutoff(accounts, tokenService);

    @Test
    void leftoverPersonasAreLockedAndTheirSessionsEnded() {
        Account admin = persona(DemoPersona.ADMIN);
        Account hr = persona(DemoPersona.HR);
        when(accounts.findByDemoPersonaIsNotNull()).thenReturn(List.of(admin, hr));

        shutoff.run(null);

        assertThat(admin.getStatus()).isEqualTo(AccountStatus.LOCKED);
        assertThat(hr.getStatus()).isEqualTo(AccountStatus.LOCKED);
        verify(tokenService).revokeAll(admin.getId());
        verify(tokenService).revokeAll(hr.getId());
    }

    @Test
    void aPersonaThatIsAlreadyLockedIsLeftAlone() {
        Account locked = persona(DemoPersona.HR);
        locked.lock();
        Account active = persona(DemoPersona.EMPLOYEE);
        when(accounts.findByDemoPersonaIsNotNull()).thenReturn(List.of(locked, active));

        shutoff.run(null);

        assertThat(locked.getStatus()).isEqualTo(AccountStatus.LOCKED);
        assertThat(active.getStatus()).isEqualTo(AccountStatus.LOCKED);
        verify(tokenService).revokeAll(active.getId());
        verifyNoMoreInteractions(tokenService);
    }

    @Test
    void aDatabaseWithoutPersonasIsNotTouched() {
        when(accounts.findByDemoPersonaIsNotNull()).thenReturn(List.of());

        shutoff.run(null);

        verify(accounts).findByDemoPersonaIsNotNull();
        verifyNoMoreInteractions(accounts);
        verifyNoInteractions(tokenService);
    }

    private static Account persona(DemoPersona persona) {
        Account account = Account.forDemoPersona(persona, "hash", Instant.EPOCH);
        ReflectionTestUtils.setField(account, "id", UUID.randomUUID());
        return account;
    }
}
