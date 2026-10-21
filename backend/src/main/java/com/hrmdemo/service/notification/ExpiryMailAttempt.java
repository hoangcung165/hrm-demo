package com.hrmdemo.service.notification;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.UUID;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.repository.notification.ExpiryDeliveryRepository;
import com.hrmdemo.service.auth.AccountService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The row is locked across SMTP and its send marker. Failed sends remain pending. */
@Slf4j
@Service
public class ExpiryMailAttempt {
    private final ExpiryDeliveryRepository deliveries;
    private final AccountService accounts;
    private final CurrentLegalEntity legalEntity;
    private final ExpiryNotificationScanner scanner;
    private final JavaMailSender sender;
    private final Clock clock;
    private final String appUrl;
    private final String from;

    public ExpiryMailAttempt(ExpiryDeliveryRepository deliveries, AccountService accounts,
            CurrentLegalEntity legalEntity, ExpiryNotificationScanner scanner, JavaMailSender sender, Clock clock,
            @Value("${hrm.app-url}") String appUrl, @Value("${hrm.mail.from}") String from) {
        this.deliveries = deliveries;
        this.accounts = accounts;
        this.legalEntity = legalEntity;
        this.scanner = scanner;
        this.sender = sender;
        this.clock = clock;
        this.appUrl = appUrl;
        this.from = from;
    }

    @Transactional
    public boolean sendOne(UUID id) {
        var queued = deliveries.lockPending(legalEntity.id(), id);
        if (queued.isEmpty()) return false;
        var delivery = queued.get();
        if (!scanner.stillEligible(delivery)) {
            deliveries.markSent(legalEntity.id(), id, clock.instant());
            return false;
        }
        var email = accounts.emailOfEmployee(delivery.recipientId());
        if (email.isEmpty()) {
            deliveries.markSent(legalEntity.id(), id, clock.instant());
            return false;
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(email.get());
            helper.setSubject("[Sắp hết hạn] Hồ sơ nhân viên");
            helper.setText("Một hồ sơ nhân viên sắp hết hạn.\n\nXem hồ sơ: "
                    + appUrl.replaceAll("/+$", "") + delivery.targetPath());
            sender.send(message);
            deliveries.markSent(legalEntity.id(), id, clock.instant());
            return true;
        } catch (MessagingException | MailException e) {
            log.warn("Could not send expiry warning {}: {}", id, e.getMessage());
            return false;
        }
    }
}
