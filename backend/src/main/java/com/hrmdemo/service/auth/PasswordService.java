package com.hrmdemo.service.auth;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import com.hrmdemo.dto.auth.ChangePasswordRequest;
import com.hrmdemo.dto.auth.PasswordPolicy;
import com.hrmdemo.dto.auth.ResetPasswordRequest;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.PasswordResetToken;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.repository.auth.PasswordResetTokenRepository;
import com.hrmdemo.security.AuthProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Change, forgot and reset password. Every password change signs the Account out everywhere
 * by revoking its refresh tokens (ADR 0001).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordService {

    private final AccountRepository accounts;
    private final PasswordResetTokenRepository resetTokens;
    private final TokenService tokenService;
    private final PasswordResetMailer mailer;
    private final PasswordEncoder passwordEncoder;
    private final AuthProperties properties;
    private final Clock clock;

    @Transactional
    public void changePassword(UUID accountId, ChangePasswordRequest request) {
        Account account = accounts.findById(accountId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "auth.unauthenticated",
                        "Account no longer exists"));
        // 400, not 401: the frontend treats 401 as "access token expired" and would retry with a refresh.
        if (!passwordEncoder.matches(request.currentPassword(), account.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "auth.current_password_incorrect",
                    "Current password is incorrect");
        }
        setPassword(account, request.newPassword());
    }

    /**
     * Emails a reset link when the email belongs to an active Account. Never tells the caller whether it did,
     * so the API cannot be used to find out which emails exist.
     */
    @Transactional
    public void forgotPassword(String email, Locale locale) {
        accounts.findByEmail(AuthService.normalizeEmail(email))
                .filter(Account::isActive)
                .ifPresent(account -> sendResetLink(account, locale));
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        Instant now = clock.instant();
        PasswordResetToken token = resetTokens.findByTokenHash(OpaqueToken.hash(request.token()))
                .filter(found -> found.isUsable(now))
                .orElseThrow(PasswordService::invalidResetToken);
        Account account = accounts.findById(token.getAccountId())
                .filter(Account::isActive)
                .orElseThrow(PasswordService::invalidResetToken);
        token.markUsed(now);
        setPassword(account, request.newPassword());
    }

    private void sendResetLink(Account account, Locale locale) {
        Instant now = clock.instant();
        resetTokens.invalidateAllForAccount(account.getId(), now);
        String raw = OpaqueToken.generate();
        resetTokens.save(new PasswordResetToken(account.getId(), OpaqueToken.hash(raw), now,
                now.plus(properties.passwordResetTtl())));
        try {
            mailer.send(account.getEmail(), raw, properties.passwordResetTtl().toMinutes(), locale);
        } catch (MailException e) {
            // Still answer 204: an error here would reveal that the email exists.
            log.error("Could not send the password reset email for Account {}", account.getId(), e);
        }
    }

    private void setPassword(Account account, String newPassword) {
        if (newPassword.getBytes(StandardCharsets.UTF_8).length > PasswordPolicy.MAX_LENGTH) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "auth.password_too_long",
                    "Password is longer than 72 bytes");
        }
        account.changePassword(passwordEncoder.encode(newPassword));
        tokenService.revokeAll(account.getId());
    }

    private static ApiException invalidResetToken() {
        return new ApiException(HttpStatus.BAD_REQUEST, "auth.reset_token_invalid",
                "Reset link is invalid, expired or already used");
    }
}
