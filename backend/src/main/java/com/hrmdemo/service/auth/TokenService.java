package com.hrmdemo.service.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import com.hrmdemo.dto.auth.RotatedRefreshToken;
import com.hrmdemo.entity.auth.RefreshToken;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.auth.RefreshTokenRepository;
import com.hrmdemo.security.AuthProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Refresh tokens (ADR 0001): opaque random values, stored as SHA-256 hashes, valid for one use.
 * Each use issues the next token of the same family. Using a token again after the short grace period
 * ({@code hrm.auth.refresh-reuse-grace}) revokes the whole family.
 */
@Service
@RequiredArgsConstructor
public class TokenService {

    private final RefreshTokenRepository refreshTokens;
    private final AuthProperties properties;
    private final Clock clock;

    /** Starts a new token family for a fresh login and returns the raw token. */
    @Transactional
    public String issue(UUID accountId) {
        return create(accountId, UUID.randomUUID(), clock.instant());
    }

    /**
     * Exchanges a refresh token for the next one in its family.
     * The reuse case must commit the revocation, so {@link ApiException} does not roll back.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public RotatedRefreshToken rotate(String rawToken) {
        Instant now = clock.instant();
        RefreshToken current = refreshTokens.findByTokenHash(OpaqueToken.hash(rawToken))
                .orElseThrow(() -> invalid("auth.refresh_token_invalid", "Refresh token is not recognised"));
        if (current.isReusedAfter(properties.refreshReuseGrace(), now)) {
            refreshTokens.revokeFamily(current.getFamilyId(), now);
            throw invalid("auth.refresh_token_reused", "Refresh token was already used; sign in again");
        }
        if (current.isRevoked()) {
            throw invalid("auth.refresh_token_invalid", "Refresh token was revoked; sign in again");
        }
        if (current.isExpired(now)) {
            throw invalid("auth.refresh_token_expired", "Refresh token has expired; sign in again");
        }
        // A token used moments ago may be exchanged again: the browser can abort a page load before it stores
        // the new cookie (fast double reload), or two tabs can refresh at once. The first use time is kept,
        // so the grace period does not slide.
        if (!current.isUsed()) {
            current.markUsed(now);
        }
        String next = create(current.getAccountId(), current.getFamilyId(), now);
        return new RotatedRefreshToken(current.getAccountId(), next);
    }

    /** Revokes the family of the given token (logout). Unknown tokens are ignored. */
    @Transactional
    public void revoke(String rawToken) {
        refreshTokens.findByTokenHash(OpaqueToken.hash(rawToken))
                .ifPresent(token -> refreshTokens.revokeFamily(token.getFamilyId(), clock.instant()));
    }

    /** Signs the Account out everywhere, e.g. after a password change (ADR 0001). */
    @Transactional
    public void revokeAll(UUID accountId) {
        refreshTokens.revokeAllForAccount(accountId, clock.instant());
    }

    private String create(UUID accountId, UUID familyId, Instant now) {
        String raw = OpaqueToken.generate();
        refreshTokens.save(new RefreshToken(accountId, familyId, OpaqueToken.hash(raw), now,
                now.plus(properties.refreshTokenTtl())));
        return raw;
    }

    private static ApiException invalid(String code, String detail) {
        return new ApiException(HttpStatus.UNAUTHORIZED, code, detail);
    }
}
