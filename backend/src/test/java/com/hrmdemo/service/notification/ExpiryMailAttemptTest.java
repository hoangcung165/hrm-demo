package com.hrmdemo.service.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.dto.employee.ExpiryType;
import com.hrmdemo.repository.notification.ExpiryDeliveryRepository;
import com.hrmdemo.service.auth.AccountService;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

class ExpiryMailAttemptTest {
    final ExpiryDeliveryRepository deliveries = mock(ExpiryDeliveryRepository.class);
    final AccountService accounts = mock(AccountService.class);
    final CurrentLegalEntity legalEntity = mock(CurrentLegalEntity.class);
    final ExpiryNotificationScanner scanner = mock(ExpiryNotificationScanner.class);
    final JavaMailSender sender = mock(JavaMailSender.class);
    final Clock clock = Clock.fixed(Instant.parse("2026-10-21T01:00:00Z"), ZoneOffset.UTC);
    final UUID tenant = UUID.randomUUID(), recipient = UUID.randomUUID(), id = UUID.randomUUID();
    final ExpiryDeliveryRepository.Pending pending = new ExpiryDeliveryRepository.Pending(id, recipient,
            ExpiryType.VISA, UUID.randomUUID(), UUID.randomUUID(), LocalDate.of(2026, 11, 1), 60,
            "/employees/" + recipient + "?tab=documents");
    final ExpiryMailAttempt mail = new ExpiryMailAttempt(deliveries, accounts, legalEntity, scanner, sender, clock,
            "https://hrm.example/", "notice@hrm.example");

    @Test
    void transportFailureRemainsPendingAndNextAttemptSendsWithoutPrivateNumbers() throws Exception {
        when(legalEntity.id()).thenReturn(tenant);
        when(deliveries.lockPending(tenant, id)).thenReturn(Optional.of(pending));
        when(scanner.stillEligible(pending)).thenReturn(true);
        when(accounts.emailOfEmployee(recipient)).thenReturn(Optional.of("recipient@example.test"));
        MimeMessage message = new MimeMessage(jakarta.mail.Session.getInstance(new java.util.Properties()));
        when(sender.createMimeMessage()).thenReturn(message);
        doThrow(new MailSendException("offline")).doNothing().when(sender).send(message);

        assertThat(mail.sendOne(id)).isFalse();
        verify(deliveries, never()).markSent(any(), any(), any());
        assertThat(mail.sendOne(id)).isTrue();
        verify(deliveries).markSent(tenant, id, clock.instant());
        String body = (String) message.getContent();
        assertThat(body).contains("/employees/" + recipient + "?tab=documents")
                .doesNotContain("salary", "PRIVATE-NUMBER");
    }

    @Test
    void staleWarningAndLockedRecipientAreDroppedWithoutAnEmail() {
        when(legalEntity.id()).thenReturn(tenant);
        when(deliveries.lockPending(tenant, id)).thenReturn(Optional.of(pending));
        assertThat(mail.sendOne(id)).isFalse(); // Source changed or permission revoked.
        verify(deliveries).markSent(tenant, id, clock.instant());
        verifyNoInteractions(sender);

        reset(deliveries);
        when(deliveries.lockPending(tenant, id)).thenReturn(Optional.of(pending));
        when(scanner.stillEligible(pending)).thenReturn(true);
        when(accounts.emailOfEmployee(recipient)).thenReturn(Optional.empty());
        assertThat(mail.sendOne(id)).isFalse();
        verify(deliveries).markSent(tenant, id, clock.instant());
        verifyNoInteractions(sender);
    }
}
