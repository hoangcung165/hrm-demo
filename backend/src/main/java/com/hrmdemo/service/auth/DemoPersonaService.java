package com.hrmdemo.service.auth;

import java.util.Arrays;
import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.auth.AuthSession;
import com.hrmdemo.dto.auth.DemoPersonasResponse;
import com.hrmdemo.dto.auth.DemoSignInRequest;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.DemoPersona;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.security.CurrentAccount;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * "Demo as…": a signed-in Account switches to a demo persona without a password. The bean exists only when
 * {@code hrm.demo-personas.enabled} is true, so nothing can issue such a session otherwise.
 * <p>
 * Who may switch: any Account that is signed in and still active in the database (the access token alone is
 * not enough: it outlives a lock by a few minutes). To whom: only an active Account seeded as a persona.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "hrm.demo-personas.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DemoPersonaService {

    private final AccountRepository accounts;
    private final AuthService authService;
    private final TokenService tokenService;

    /** Every persona in role order; one whose Account is missing or locked is listed as not available. */
    @Transactional(readOnly = true)
    public DemoPersonasResponse personas(CurrentAccount caller) {
        requireActiveCaller(caller);
        Map<DemoPersona, Account> stored = new EnumMap<>(DemoPersona.class);
        accounts.findByDemoPersonaIsNotNull().forEach(account -> stored.put(account.getDemoPersona(), account));
        return new DemoPersonasResponse(Arrays.stream(DemoPersona.values())
                .map(persona -> new DemoPersonasResponse.Persona(persona.name(), persona.fullName(),
                        persona.title(), persona.roles().stream().map(Role::name).toList(),
                        stored.containsKey(persona) && stored.get(persona).isActive()))
                .toList());
    }

    /**
     * Ends the session the request came from and starts one for the persona.
     *
     * @param refreshToken  the caller's refresh cookie, or null. Its whole token family is revoked, also when
     *                      the token was already exchanged; without a cookie, or with one that is not
     *                      recognised, there is nothing to end and the switch still goes through
     * @param remoteAddress where the request came from, for the log
     */
    @Transactional
    public AuthSession signIn(CurrentAccount caller, DemoSignInRequest request, String refreshToken,
            String remoteAddress) {
        DemoPersona persona = persona(request.persona());
        Account from = requireActiveCaller(caller);
        Account target = accounts.findByDemoPersona(persona)
                .filter(Account::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "demo.persona_unavailable",
                        "The demo persona is missing or locked"));
        if (StringUtils.hasText(refreshToken)) {
            tokenService.revoke(refreshToken);
        }
        AuthSession session = authService.startSession(target);
        log.info("Demo sign-in: persona {} (Account {}) by Account {} from {}", persona, target.getId(),
                from.getId(), remoteAddress);
        return session;
    }

    private Account requireActiveCaller(CurrentAccount caller) {
        Account account = accounts.findById(caller.id())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "auth.unauthenticated",
                        "Account no longer exists"));
        if (!account.isActive()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "auth.account_locked", "Account is locked");
        }
        return account;
    }

    private static DemoPersona persona(String key) {
        for (DemoPersona persona : DemoPersona.values()) {
            if (persona.name().equals(key)) {
                return persona;
            }
        }
        throw AccountService.invalid("persona");
    }
}
