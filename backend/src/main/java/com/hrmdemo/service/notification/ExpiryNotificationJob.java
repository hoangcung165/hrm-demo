package com.hrmdemo.service.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Daily company-time scan; pending email is also retried every fifteen minutes after transport outages. */
@Slf4j
@Component
@RequiredArgsConstructor
public class ExpiryNotificationJob {
    private final ExpiryNotificationScanner scanner;
    private final ExpiryMailService mail;

    @Scheduled(cron = "${hrm.expiry.scan.cron:0 0 8 * * *}", zone = "Asia/Ho_Chi_Minh")
    public void scan() {
        try {
            scanner.scan();
        } catch (RuntimeException e) {
            log.error("Expiry scan failed; the next scan can retry without duplicate warnings", e);
        }
        sendPending();
    }

    @Scheduled(initialDelayString = "PT1M", fixedDelayString = "PT15M")
    public void sendPending() {
        try {
            mail.sendPending();
        } catch (RuntimeException e) {
            log.warn("Expiry email retry failed", e);
        }
    }
}
