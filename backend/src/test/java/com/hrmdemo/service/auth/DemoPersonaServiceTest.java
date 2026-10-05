package com.hrmdemo.service.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.auth.AccessTokenResponse;
import com.hrmdemo.dto.auth.AuthSession;
import com.hrmdemo.dto.auth.DemoPersonasResponse;
import com.hrmdemo.dto.auth.DemoSignInRequest;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.DemoPersona;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.security.CurrentAccount;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/** The rules of "Demo as…": who may switch, to whom, and what happens to the session they came from. */
@ExtendWith(MockitoExtension.class)
class DemoPersonaServiceTest {

    static final Instant NOW = Instant.parse("2026-10-05T08:00:00Z");
    static final UUID CALLER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final UUID HR_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
    /** The token says EMPLOYEE: the switch needs no permission, only a signed-in, active Account. */
    static final CurrentAccount CALLER = new CurrentAccount(CALLER_ID, Set.of("EMPLOYEE"));
    static final AuthSession HR_SESSION =
            new AuthSession(AccessTokenResponse.bearer("hr-access", 900), "hr-refresh");

    @Mock
    AccountRepository accounts;
    @Mock
    AuthService authService;
    @Mock
    TokenService tokenService;

    DemoPersonaService service;
    Account caller;
    Account hr;

    @BeforeEach
    void setUp() {
        service = new DemoPersonaService(accounts, authService, tokenService);
        caller = new Account("someone@hrm.test", "Someone", "hash", NOW);
        ReflectionTestUtils.setField(caller, "id", CALLER_ID);
        caller.addRole(Role.EMPLOYEE);
        hr = Account.forDemoPersona(DemoPersona.HR, "hash", NOW);
        ReflectionTestUtils.setField(hr, "id", HR_ID);
        lenient().when(accounts.findById(CALLER_ID)).thenReturn(Optional.of(caller));
        lenient().when(accounts.findByDemoPersona(DemoPersona.HR)).thenReturn(Optional.of(hr));
        lenient().when(authService.startSession(hr)).thenReturn(HR_SESSION);
    }

    // --- sign in ---

    @Test
    void switchingEndsTheSessionTheRequestCameFromAndStartsThePersonas() {
        AuthSession session = service.signIn(CALLER, new DemoSignInRequest("HR"), "my-refresh-token", "10.0.0.7");

        assertThat(session).isSameAs(HR_SESSION);
        InOrder order = inOrder(tokenService, authService);
        order.verify(tokenService).revoke("my-refresh-token");
        order.verify(authService).startSession(hr);
        // Only that one session: the caller's other sessions and the persona's own are left alone.
        verify(tokenService, never()).revokeAll(any());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "  "})
    void withoutARefreshCookieThereIsNothingToEndAndTheSwitchStillGoesThrough(String refreshToken) {
        AuthSession session = service.signIn(CALLER, new DemoSignInRequest("HR"), refreshToken, "10.0.0.7");

        assertThat(session).isSameAs(HR_SESSION);
        verifyNoInteractions(tokenService);
    }

    @Test
    void aPersonaSwitchesToAnotherPersona() {
        Account director = Account.forDemoPersona(DemoPersona.DIRECTOR, "hash", NOW);
        ReflectionTestUtils.setField(director, "id", CALLER_ID);
        when(accounts.findById(CALLER_ID)).thenReturn(Optional.of(director));

        assertThat(service.signIn(new CurrentAccount(CALLER_ID, Set.of("DIRECTOR", "EMPLOYEE")),
                new DemoSignInRequest("HR"), "director-refresh", "10.0.0.7")).isSameAs(HR_SESSION);

        verify(tokenService).revoke("director-refresh");
    }

    @Test
    void aCallerWhoWasLockedAfterTheirTokenWasIssuedCannotSwitch() {
        caller.lock();

        assertCode(401, "auth.account_locked",
                () -> service.signIn(CALLER, new DemoSignInRequest("HR"), "my-refresh-token", "10.0.0.7"));

        verifyNoInteractions(tokenService, authService);
    }

    @Test
    void aCallerWhoseAccountIsGoneCannotSwitch() {
        when(accounts.findById(CALLER_ID)).thenReturn(Optional.empty());

        assertCode(401, "auth.unauthenticated",
                () -> service.signIn(CALLER, new DemoSignInRequest("HR"), "my-refresh-token", "10.0.0.7"));

        verifyNoInteractions(tokenService, authService);
    }

    @Test
    void aLockedPersonaIsUnavailableAndTheCallerKeepsTheirSession() {
        hr.lock();

        assertCode(409, "demo.persona_unavailable",
                () -> service.signIn(CALLER, new DemoSignInRequest("HR"), "my-refresh-token", "10.0.0.7"));

        verifyNoInteractions(tokenService, authService);
    }

    @Test
    void aPersonaThatWasNeverSeededIsUnavailable() {
        when(accounts.findByDemoPersona(DemoPersona.DIRECTOR)).thenReturn(Optional.empty());

        assertCode(409, "demo.persona_unavailable",
                () -> service.signIn(CALLER, new DemoSignInRequest("DIRECTOR"), "my-refresh-token", "10.0.0.7"));

        verifyNoInteractions(tokenService, authService);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"BOSS", "hr", "", "someone@hrm.test"})
    void aKeyThatIsNotAPersonaMakesTheRequestInvalidAndNoAccountIsLookedUp(String key) {
        assertThatThrownBy(() -> service.signIn(CALLER, new DemoSignInRequest(key), "my-refresh-token", "10.0.0.7"))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus().value()).isEqualTo(400);
                    assertThat(ex.getCode()).isEqualTo("validation.invalid");
                    assertThat(ex.getProperties().get("errors"))
                            .isEqualTo(List.of(Map.of("field", "persona", "code", "Invalid")));
                });

        // An ordinary Account can never be the target: the key is matched against the personas only.
        verifyNoInteractions(accounts, tokenService, authService);
    }

    // --- list ---

    @Test
    void theListHasEveryPersonaInRoleOrderWithNameTitleAndRoles() {
        when(accounts.findByDemoPersonaIsNotNull()).thenReturn(List.of(hr));

        DemoPersonasResponse list = service.personas(CALLER);

        assertThat(list.personas()).extracting(DemoPersonasResponse.Persona::persona)
                .containsExactly("ADMIN", "HR", "LINE_MANAGER", "PROJECT_MANAGER", "ACCOUNTANT", "DIRECTOR",
                        "EMPLOYEE");
        DemoPersonasResponse.Persona second = list.personas().get(1);
        assertThat(second.fullName()).isEqualTo("Trần Thị Mai");
        assertThat(second.title()).isEqualTo("Trưởng phòng nhân sự");
        assertThat(second.roles()).containsExactly("HR", "EMPLOYEE");
        assertThat(list.personas().get(0).roles()).containsExactly("ADMIN");
        assertThat(list.personas().get(6).roles()).containsExactly("EMPLOYEE");
    }

    @Test
    void aPersonaIsAvailableOnlyWhileItsAccountExistsAndIsActive() {
        Account lockedDirector = Account.forDemoPersona(DemoPersona.DIRECTOR, "hash", NOW);
        lockedDirector.lock();
        when(accounts.findByDemoPersonaIsNotNull()).thenReturn(List.of(hr, lockedDirector));

        DemoPersonasResponse list = service.personas(CALLER);

        assertThat(list.personas()).filteredOn(DemoPersonasResponse.Persona::available)
                .extracting(DemoPersonasResponse.Persona::persona).containsExactly("HR");
        assertThat(list.personas()).hasSize(7);
    }

    @Test
    void aLockedCallerDoesNotGetTheList() {
        caller.lock();

        assertCode(401, "auth.account_locked", () -> service.personas(CALLER));

        verify(accounts, never()).findByDemoPersonaIsNotNull();
    }

    private static void assertCode(int status, String code, Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getStatus().value()).isEqualTo(status);
            assertThat(ex.getCode()).isEqualTo(code);
        });
    }
}
