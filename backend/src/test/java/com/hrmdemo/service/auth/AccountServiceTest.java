package com.hrmdemo.service.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.auth.AccountResponse;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.mapper.auth.AccountMapper;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    static final UUID ME = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final UUID SOMEONE_ELSE = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @Mock
    AccountRepository accounts;
    @Mock
    AccountMapper mapper;

    AccountService service;

    @BeforeEach
    void setUp() {
        service = new AccountService(accounts, new AccessScopeService(employeeId -> Set.of()), mapper);
    }

    @Test
    void anEmployeeReadsTheirOwnAccount() {
        AccountResponse mine = stored(ME);

        assertThat(service.account(caller("EMPLOYEE"), ME)).isEqualTo(mine);
    }

    @Test
    void anEmployeeCannotReadAnotherAccountAndTheDatabaseIsNotEvenAsked() {
        assertThatThrownBy(() -> service.account(caller("EMPLOYEE"), SOMEONE_ELSE))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus().value()).isEqualTo(403);
                    assertThat(ex.getCode()).isEqualTo("auth.forbidden");
                });

        verifyNoInteractions(accounts);
    }

    @Test
    void hrReadsAnotherAccount() {
        AccountResponse theirs = stored(SOMEONE_ELSE);

        assertThat(service.account(caller("HR"), SOMEONE_ELSE)).isEqualTo(theirs);
    }

    @Test
    void anAccountThatDoesNotExistIsNotFoundForACompanyWideCaller() {
        when(accounts.findById(SOMEONE_ELSE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.account(caller("HR"), SOMEONE_ELSE))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus().value()).isEqualTo(404);
                    assertThat(ex.getCode()).isEqualTo("account.not_found");
                });
    }

    private AccountResponse stored(UUID id) {
        var account = new Account("someone@hrm.test", "hash", Instant.parse("2026-10-04T08:00:00Z"));
        var response = new AccountResponse(id, account.getEmail(), Set.of("EMPLOYEE"), "ACTIVE");
        when(accounts.findById(id)).thenReturn(Optional.of(account));
        when(mapper.toResponse(account)).thenReturn(response);
        return response;
    }

    private static CurrentAccount caller(String role) {
        return new CurrentAccount(ME, Set.of(role));
    }
}
