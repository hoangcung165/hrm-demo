package com.hrmdemo.service.notification;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.repository.notification.ExpiryDeliveryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Drains a bounded batch; each email attempt has its own row lock and transaction. */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExpiryMailService {
    private final ExpiryDeliveryRepository deliveries;
    private final CurrentLegalEntity legalEntity;
    private final ExpiryMailAttempt attempts;

    public int sendPending() {
        int sent = 0;
        for (var id : deliveries.pendingIds(legalEntity.id(), 100)) {
            try {
                if (attempts.sendOne(id)) sent++;
            } catch (RuntimeException e) {
                log.warn("Could not process expiry email {}: {}", id, e.getMessage());
            }
        }
        return sent;
    }
}
