package com.hrmdemo.service.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.dto.auth.RotatedRefreshToken;
import com.hrmdemo.entity.auth.RefreshToken;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.auth.RefreshTokenRepository;
import com.hrmdemo.security.AuthProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TokenServiceTest {

    static final Instant NOW = Instant.parse("2026-10-04T08:00:00Z");
    static final Duration REFRESH_TTL = Duration.ofDays(7);
    static final Duration REUSE_GRACE = Duration.ofSeconds(10);
    static final UUID ACCOUNT_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final UUID FAMILY_ID = UUID.fromString("00000000-0000-0000-0000-00000000000f");
    static final String RAW = "raw-refresh-token";

    @Mock
    RefreshTokenRepository refreshTokens;

    TokenService tokenService;

    @BeforeEach
    void setUp() {
        var properties = new AuthProperties("x".repeat(32), Duration.ofMinutes(15), REFRESH_TTL, REUSE_GRACE,
                Duration.ofMinutes(30), true);
        tokenService = new TokenService(refreshTokens, properties, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void issueStoresOnlyTheHashAndSetsExpiry() {
        String raw = tokenService.issue(ACCOUNT_ID);

        RefreshToken saved = savedToken();
        assertThat(saved.getTokenHash()).isEqualTo(OpaqueToken.hash(raw)).isNotEqualTo(raw).hasSize(64);
        assertThat(saved.getAccountId()).isEqualTo(ACCOUNT_ID);
        assertThat(saved.getExpiresAt()).isEqualTo(NOW.plus(REFRESH_TTL));
    }

    @Test
    void rotateMarksTheOldTokenUsedAndIssuesTheNextOneInTheSameFamily() {
        RefreshToken current = stored(NOW.plus(Duration.ofDays(1)));

        RotatedRefreshToken rotated = tokenService.rotate(RAW);

        assertThat(current.getUsedAt()).isEqualTo(NOW);
        assertThat(rotated.accountId()).isEqualTo(ACCOUNT_ID);
        assertThat(rotated.token()).isNotEqualTo(RAW);
        RefreshToken next = savedToken();
        assertThat(next.getFamilyId()).isEqualTo(FAMILY_ID);
        assertThat(next.getTokenHash()).isEqualTo(OpaqueToken.hash(rotated.token()));
        assertThat(next.getExpiresAt()).isEqualTo(NOW.plus(REFRESH_TTL));
        verify(refreshTokens, never()).revokeFamily(any(), any());
    }

    @Test
    void rotateRejectsAnExpiredToken() {
        RefreshToken current = stored(NOW);

        assertThatThrownBy(() -> tokenService.rotate(RAW))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("auth.refresh_token_expired"));

        assertThat(current.isUsed()).isFalse();
        verify(refreshTokens, never()).save(any());
        verify(refreshTokens, never()).revokeFamily(any(), any());
    }

    @Test
    void aTokenUsedWithinTheGracePeriodCanBeExchangedAgainWithoutRevokingTheFamily() {
        RefreshToken current = stored(NOW.plus(Duration.ofDays(1)));
        Instant firstUse = NOW.minus(REUSE_GRACE).plusSeconds(1);
        current.markUsed(firstUse);

        RotatedRefreshToken rotated = tokenService.rotate(RAW);

        assertThat(rotated.token()).isNotEqualTo(RAW);
        assertThat(savedToken().getFamilyId()).isEqualTo(FAMILY_ID);
        assertThat(current.getUsedAt()).as("the grace period does not slide").isEqualTo(firstUse);
        verify(refreshTokens, never()).revokeFamily(any(), any());
    }

    @Test
    void aTokenUsedExactlyAtTheEndOfTheGracePeriodIsReuse() {
        RefreshToken current = stored(NOW.plus(Duration.ofDays(1)));
        current.markUsed(NOW.minus(REUSE_GRACE));

        assertThatThrownBy(() -> tokenService.rotate(RAW))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("auth.refresh_token_reused"));

        verify(refreshTokens).revokeFamily(FAMILY_ID, NOW);
    }

    @Test
    void aRevokedTokenIsRejectedEvenWithinTheGracePeriod() {
        RefreshToken current = stored(NOW.plus(Duration.ofDays(1)));
        current.markUsed(NOW.minusSeconds(1));
        current.revoke(NOW.minusSeconds(1));

        assertThatThrownBy(() -> tokenService.rotate(RAW))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("auth.refresh_token_invalid"));

        verify(refreshTokens, never()).save(any());
    }

    @Test
    void reusingARotatedTokenRevokesTheWholeFamily() {
        RefreshToken current = stored(NOW.plus(Duration.ofDays(1)));
        current.markUsed(NOW.minusSeconds(60));

        assertThatThrownBy(() -> tokenService.rotate(RAW))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("auth.refresh_token_reused"));

        verify(refreshTokens).revokeFamily(FAMILY_ID, NOW);
        verify(refreshTokens, never()).save(any());
    }

    @Test
    void rotateRejectsARevokedToken() {
        RefreshToken current = stored(NOW.plus(Duration.ofDays(1)));
        current.revoke(NOW.minusSeconds(60));

        assertThatThrownBy(() -> tokenService.rotate(RAW))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("auth.refresh_token_invalid"));

        verify(refreshTokens, never()).save(any());
    }

    @Test
    void rotateRejectsAnUnknownToken() {
        when(refreshTokens.findByTokenHash(OpaqueToken.hash(RAW))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tokenService.rotate(RAW))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("auth.refresh_token_invalid"));

        verify(refreshTokens, never()).save(any());
    }

    @Test
    void revokeRevokesTheFamilyOfTheToken() {
        stored(NOW.plus(Duration.ofDays(1)));

        tokenService.revoke(RAW);

        verify(refreshTokens).revokeFamily(FAMILY_ID, NOW);
    }

    private RefreshToken stored(Instant expiresAt) {
        var token = new RefreshToken(ACCOUNT_ID, FAMILY_ID, OpaqueToken.hash(RAW), NOW.minus(Duration.ofDays(1)),
                expiresAt);
        when(refreshTokens.findByTokenHash(OpaqueToken.hash(RAW))).thenReturn(Optional.of(token));
        return token;
    }

    private RefreshToken savedToken() {
        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokens).save(captor.capture());
        return captor.getValue();
    }
}
