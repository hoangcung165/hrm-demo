package com.hrmdemo.service.notification;

import java.time.Clock;
import java.util.UUID;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.dto.employee.UpcomingExpiryItem;
import com.hrmdemo.entity.notification.Notification;
import com.hrmdemo.repository.notification.ExpiryDeliveryRepository;
import com.hrmdemo.repository.notification.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** One delivery key and one bell line commit together. A loser of the unique insert writes neither. */
@Service
@RequiredArgsConstructor
public class ExpiryNoticeWriter {
    private final ExpiryDeliveryRepository deliveries;
    private final NotificationRepository notifications;
    private final CurrentLegalEntity legalEntity;
    private final Clock clock;

    @Transactional
    public boolean record(UpcomingExpiryItem item, int milestone, UUID recipientId) {
        var at = clock.instant();
        if (!deliveries.insert(legalEntity.id(), item.type(), item.sourceId(), item.employeeId(), item.expiresOn(), milestone,
                recipientId, item.sourcePath(), at)) {
            return false;
        }
        String summary = item.employeeName() + " · " + item.type().name() + " · " + item.expiresOn();
        notifications.save(Notification.expiry(recipientId, summary, item.sourcePath(), at));
        return true;
    }
}
