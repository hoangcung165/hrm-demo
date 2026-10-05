package com.hrmdemo.service.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.auth.MeResponse;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.DemoPersona;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.service.accessscope.AccessScopeService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/** What {@code GET /api/me} tells the UI about "Demo as…". */
class AuthServiceDemoTest {

    static final Instant NOW = Instant.parse("2026-10-05T08:00:00Z");
    static final UUID ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    final AccountRepository accounts = mock(AccountRepository.class);
    // me() reads the Account and the Access scope; the token and password collaborators are not used.
    final AuthService service = new AuthService(accounts, null, null, null, null,
            Clock.fixed(NOW, ZoneOffset.UTC), new AccessScopeService(employeeId -> Set.of()));

    @Test
    void withTheFlagOnAPersonaAccountShowsItsPersonaKey() {
        demoPersonas(true);
        stored(Account.forDemoPersona(DemoPersona.LINE_MANAGER, "hash", NOW));

        MeResponse me = service.me(ID);

        assertThat(me.demo()).isEqualTo(new MeResponse.Demo(true, "LINE_MANAGER"));
        assertThat(me.fullName()).isEqualTo("Lê Văn Hùng");
        assertThat(me.roles()).containsExactlyInAnyOrder("LINE_MANAGER", "EMPLOYEE");
    }

    @Test
    void withTheFlagOnAnOrdinaryAccountSeesTheSwitchButIsNoPersona() {
        demoPersonas(true);
        stored(ordinary());

        assertThat(service.me(ID).demo()).isEqualTo(new MeResponse.Demo(true, null));
    }

    @Test
    void withTheFlagOffNothingShowsEvenForAPersonaAccountLeftInTheDatabase() {
        demoPersonas(false);
        stored(Account.forDemoPersona(DemoPersona.HR, "hash", NOW));
        assertThat(service.me(ID).demo()).isEqualTo(new MeResponse.Demo(false, null));

        stored(ordinary());
        assertThat(service.me(ID).demo()).isEqualTo(new MeResponse.Demo(false, null));
    }

    private void demoPersonas(boolean enabled) {
        ReflectionTestUtils.setField(service, "demoPersonasEnabled", enabled);
    }

    private void stored(Account account) {
        ReflectionTestUtils.setField(account, "id", ID);
        when(accounts.findById(ID)).thenReturn(Optional.of(account));
    }

    private static Account ordinary() {
        Account account = new Account("mai.tran@hrm.test", "Trần Thị Mai", "hash", NOW);
        account.addRole(Role.HR);
        return account;
    }
}
