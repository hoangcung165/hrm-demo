package com.hrmdemo.service.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.hrmdemo.dto.auth.AccessTokenResponse;
import com.hrmdemo.dto.auth.AuthSession;
import com.hrmdemo.dto.auth.LoginRequest;
import com.hrmdemo.dto.auth.MeResponse;
import com.hrmdemo.dto.auth.RotatedRefreshToken;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.security.AuthProperties;
import com.hrmdemo.security.JwtClaims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Sign-in, token refresh and sign-out for Accounts. */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AccountRepository accounts;
    private final TokenService tokenService;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final AuthProperties properties;
    private final Clock clock;

    @Transactional
    public AuthSession login(LoginRequest request) {
        Account account = accounts.findByEmail(normalizeEmail(request.email()))
                .filter(found -> passwordEncoder.matches(request.password(), found.getPasswordHash()))
                // Same error for unknown email and wrong password, so the API does not reveal which emails exist.
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "auth.invalid_credentials",
                        "Email or password is incorrect"));
        requireActive(account);
        return new AuthSession(accessToken(account), tokenService.issue(account.getId()));
    }

    @Transactional(noRollbackFor = ApiException.class)
    public AuthSession refresh(String refreshToken) {
        RotatedRefreshToken rotated = tokenService.rotate(refreshToken);
        Account account = accounts.findById(rotated.accountId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "auth.refresh_token_invalid",
                        "Refresh token is not recognised"));
        requireActive(account);
        return new AuthSession(accessToken(account), rotated.token());
    }

    @Transactional
    public void logout(String refreshToken) {
        tokenService.revoke(refreshToken);
    }

    @Transactional(readOnly = true)
    public MeResponse me(UUID accountId) {
        Account account = accounts.findById(accountId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "auth.unauthenticated",
                        "Account no longer exists"));
        return new MeResponse(account.getId(), account.getEmail(), account.roleNames());
    }

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static void requireActive(Account account) {
        if (!account.isActive()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "auth.account_locked", "Account is locked");
        }
    }

    private AccessTokenResponse accessToken(Account account) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(account.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plus(properties.accessTokenTtl()))
                .claim(JwtClaims.ROLES, List.copyOf(account.roleNames()))
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        return AccessTokenResponse.bearer(token, properties.accessTokenTtl().toSeconds());
    }
}
