package com.hrmdemo.entity.auth;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** One-time token behind a password reset link, stored as a SHA-256 hash. */
@Entity
@Table(name = "password_reset_token")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    public PasswordResetToken(UUID accountId, String tokenHash, Instant createdAt, Instant expiresAt) {
        this.accountId = accountId;
        this.tokenHash = tokenHash;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public boolean isUsable(Instant now) {
        return usedAt == null && now.isBefore(expiresAt);
    }

    public void markUsed(Instant now) {
        this.usedAt = now;
    }
}
