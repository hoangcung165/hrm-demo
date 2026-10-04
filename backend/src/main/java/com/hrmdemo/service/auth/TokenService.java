package com.hrmdemo.service.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
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
 * Each use issues the next token of the same family; using a token twice revokes the whole family.
 */
@Service
@RequiredArgsConstructor
public class TokenService {

    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository refreshTokens;
    private final AuthProperties properties;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

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
        RefreshToken current = refreshTokens.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> invalid("auth.refresh_token_invalid", "Refresh token is not recognised"));
        if (current.isUsed()) {
            refreshTokens.revokeFamily(current.getFamilyId(), now);
            throw invalid("auth.refresh_token_reused", "Refresh token was already used; sign in again");
        }
        if (current.isRevoked()) {
            throw invalid("auth.refresh_token_invalid", "Refresh token was revoked; sign in again");
        }
        if (current.isExpired(now)) {
            throw invalid("auth.refresh_token_expired", "Refresh token has expired; sign in again");
        }
        current.markUsed(now);
        String next = create(current.getAccountId(), current.getFamilyId(), now);
        return new RotatedRefreshToken(current.getAccountId(), next);
    }

    /** Revokes the family of the given token (logout). Unknown tokens are ignored. */
    @Transactional
    public void revoke(String rawToken) {
        refreshTokens.findByTokenHash(hash(rawToken))
                .ifPresent(token -> refreshTokens.revokeFamily(token.getFamilyId(), clock.instant()));
    }

    private String create(UUID accountId, UUID familyId, Instant now) {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokens.save(new RefreshToken(accountId, familyId, hash(raw), now,
                now.plus(properties.refreshTokenTtl())));
        return raw;
    }

    static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private static ApiException invalid(String code, String detail) {
        return new ApiException(HttpStatus.UNAUTHORIZED, code, detail);
    }
}
