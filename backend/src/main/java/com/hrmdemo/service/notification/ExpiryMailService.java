package com.hrmdemo.service.notification;

import java.nio.charset.StandardCharsets;
import java.time.Clock;

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

/** Failed mail stays pending for the next run. Row locks prevent two runners sending it at once. */
@Slf4j
@Service
public class ExpiryMailService {
    private final ExpiryDeliveryRepository deliveries;
    private final AccountService accounts;
    private final CurrentLegalEntity legalEntity;
    private final JavaMailSender sender;
    private final Clock clock;
    private final String appUrl;
    private final String from;

    public ExpiryMailService(ExpiryDeliveryRepository deliveries, AccountService accounts,
            CurrentLegalEntity legalEntity, JavaMailSender sender, Clock clock,
            @Value("${hrm.app-url}") String appUrl, @Value("${hrm.mail.from}") String from) {
        this.deliveries = deliveries;
        this.accounts = accounts;
        this.legalEntity = legalEntity;
        this.sender = sender;
        this.clock = clock;
        this.appUrl = appUrl;
        this.from = from;
    }

    /** A bounded batch; never put personal identifiers or salaries in email. */
    @Transactional
    public int sendPending() {
        int sent = 0;
        for (var delivery : deliveries.lockPending(legalEntity.id(), 100)) {
            var email = accounts.emailOfEmployee(delivery.recipientId());
            if (email.isEmpty()) {
                // A locked/unlinked recipient is no longer eligible. Do not retry indefinitely.
                deliveries.markSent(legalEntity.id(), delivery.id(), clock.instant());
                continue;
            }
            try {
                MimeMessage message = sender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, StandardCharsets.UTF_8.name());
                helper.setFrom(from);
                helper.setTo(email.get());
                helper.setSubject("[Sắp hết hạn] Hồ sơ nhân viên");
                String link = appUrl.replaceAll("/+$", "") + delivery.targetPath();
                helper.setText("Một hồ sơ nhân viên sắp hết hạn.\n\nXem hồ sơ: " + link);
                sender.send(message);
                deliveries.markSent(legalEntity.id(), delivery.id(), clock.instant());
                sent++;
            } catch (MessagingException | MailException e) {
                log.warn("Could not send expiry warning {}: {}", delivery.id(), e.getMessage());
            }
        }
        return sent;
    }
}
