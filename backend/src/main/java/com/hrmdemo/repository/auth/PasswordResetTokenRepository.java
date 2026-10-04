package com.hrmdemo.repository.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.auth.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** Retires earlier links of the Account so only the newest one works. */
    @Modifying
    @Query("update PasswordResetToken t set t.usedAt = :now where t.accountId = :accountId and t.usedAt is null")
    int invalidateAllForAccount(@Param("accountId") UUID accountId, @Param("now") Instant now);
}
