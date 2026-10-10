package com.hrmdemo.repository.notification;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.notification.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** The bell; filtered by Legal entity (ADR 0003). */
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId, Pageable pageable);

    long countByRecipientIdAndReadAtIsNull(UUID recipientId);

    Optional<Notification> findByIdAndRecipientId(UUID id, UUID recipientId);

    @Modifying
    @Query("update Notification n set n.readAt = :at where n.recipientId = :recipient and n.readAt is null")
    int markAllRead(@Param("recipient") UUID recipientId, @Param("at") Instant at);
}
