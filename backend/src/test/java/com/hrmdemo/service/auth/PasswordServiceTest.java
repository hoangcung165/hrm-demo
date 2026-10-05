package com.hrmdemo.service.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.dto.auth.ResetPasswordRequest;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.PasswordResetToken;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.repository.auth.PasswordResetTokenRepository;
import com.hrmdemo.security.AuthProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class PasswordServiceTest {

    static final Instant NOW = Instant.parse("2026-10-04T08:00:00Z");
    static final Duration RESET_TTL = Duration.ofMinutes(30);
    static final UUID ACCOUNT_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final String RAW = "raw-reset-token";

    @Mock
    AccountRepository accounts;
    @Mock
    PasswordResetTokenRepository resetTokens;
    @Mock
    TokenService tokenService;
    @Mock
    PasswordResetMailer mailer;
    @Mock
    PasswordEncoder passwordEncoder;

    PasswordService passwordService;

    @BeforeEach
    void setUp() {
        var properties = new AuthProperties("x".repeat(32), Duration.ofMinutes(15), Duration.ofDays(7), Duration.ofSeconds(10),
                RESET_TTL,
                true);
        passwordService = new PasswordService(accounts, resetTokens, tokenService, mailer, passwordEncoder,
                properties, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void forgotPasswordStoresTheHashFor30MinutesAndMailsTheRawToken() {
        Account account = new Account("an@hrm.test", "Nguyễn Văn An", "old-hash", NOW);
        when(accounts.findByEmail("an@hrm.test")).thenReturn(Optional.of(account));

        passwordService.forgotPassword("  An@HRM.test ", Locale.ENGLISH);

        ArgumentCaptor<String> rawToken = ArgumentCaptor.forClass(String.class);
        verify(mailer).send(eq("an@hrm.test"), rawToken.capture(), eq(30L), eq(Locale.ENGLISH));
        ArgumentCaptor<PasswordResetToken> saved = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(resetTokens).save(saved.capture());
        assertThat(saved.getValue().getTokenHash()).isEqualTo(OpaqueToken.hash(rawToken.getValue()))
                .isNotEqualTo(rawToken.getValue());
        assertThat(saved.getValue().getExpiresAt()).isEqualTo(NOW.plus(RESET_TTL));
    }

    @Test
    void forgotPasswordForAnUnknownEmailDoesNothing() {
        when(accounts.findByEmail("nobody@hrm.test")).thenReturn(Optional.empty());

        passwordService.forgotPassword("nobody@hrm.test", Locale.ENGLISH);

        verifyNoInteractions(mailer, resetTokens);
    }

    @Test
    void forgotPasswordDoesNotFailWhenTheMailServerIsDown() {
        when(accounts.findByEmail("an@hrm.test"))
                .thenReturn(Optional.of(new Account("an@hrm.test", "Nguyễn Văn An", "h", NOW)));
        org.mockito.Mockito.doThrow(new MailSendException("smtp down"))
                .when(mailer).send(any(), any(), anyLong(), any());

        passwordService.forgotPassword("an@hrm.test", Locale.ENGLISH);

        verify(resetTokens).save(any());
    }

    @Test
    void resetPasswordSetsTheNewHashMarksTheTokenUsedAndRevokesRefreshTokens() {
        PasswordResetToken token = stored(NOW.plusSeconds(1));
        Account account = new Account("an@hrm.test", "Nguyễn Văn An", "old-hash", NOW);
        when(accounts.findById(ACCOUNT_ID)).thenReturn(Optional.of(account));
        when(passwordEncoder.encode("new-password")).thenReturn("new-hash");

        passwordService.resetPassword(new ResetPasswordRequest(RAW, "new-password"));

        assertThat(account.getPasswordHash()).isEqualTo("new-hash");
        assertThat(token.getUsedAt()).isEqualTo(NOW);
        verify(tokenService).revokeAll(account.getId());
    }

    @Test
    void resetPasswordRejectsAnExpiredToken() {
        stored(NOW);

        assertInvalidResetToken();
    }

    @Test
    void resetPasswordRejectsAUsedToken() {
        stored(NOW.plus(RESET_TTL)).markUsed(NOW.minusSeconds(60));

        assertInvalidResetToken();
    }

    @Test
    void resetPasswordRejectsAnUnknownToken() {
        when(resetTokens.findByTokenHash(OpaqueToken.hash(RAW))).thenReturn(Optional.empty());

        assertInvalidResetToken();
    }

    private void assertInvalidResetToken() {
        assertThatThrownBy(() -> passwordService.resetPassword(new ResetPasswordRequest(RAW, "new-password")))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("auth.reset_token_invalid"));
        verify(tokenService, never()).revokeAll(any());
        verifyNoInteractions(passwordEncoder);
    }

    private PasswordResetToken stored(Instant expiresAt) {
        var token = new PasswordResetToken(ACCOUNT_ID, OpaqueToken.hash(RAW), NOW.minus(Duration.ofMinutes(5)),
                expiresAt);
        when(resetTokens.findByTokenHash(OpaqueToken.hash(RAW))).thenReturn(Optional.of(token));
        return token;
    }
}
