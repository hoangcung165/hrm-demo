package com.hrmdemo.service.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.repository.notification.ExpiryDeliveryRepository;
import com.hrmdemo.service.auth.AccountService;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

class ExpiryMailServiceTest {
    final ExpiryDeliveryRepository deliveries = mock(ExpiryDeliveryRepository.class);
    final AccountService accounts = mock(AccountService.class);
    final CurrentLegalEntity legalEntity = mock(CurrentLegalEntity.class);
    final JavaMailSender sender = mock(JavaMailSender.class);
    final Clock clock = Clock.fixed(Instant.parse("2026-10-21T01:00:00Z"), ZoneOffset.UTC);
    final UUID tenant = UUID.randomUUID(), recipient = UUID.randomUUID(), id = UUID.randomUUID();
    final ExpiryMailService mail = new ExpiryMailService(deliveries, accounts, legalEntity, sender, clock,
            "https://hrm.example/", "notice@hrm.example");

    @Test
    void transportFailureRemainsPendingAndNextRunSendsWithoutPrivateNumbers() throws Exception {
        when(legalEntity.id()).thenReturn(tenant);
        when(deliveries.lockPending(tenant, 100)).thenReturn(List.of(new ExpiryDeliveryRepository.Pending(id,
                recipient, "/employees/" + recipient + "?tab=documents")));
        when(accounts.emailOfEmployee(recipient)).thenReturn(Optional.of("recipient@example.test"));
        MimeMessage message = new MimeMessage(jakarta.mail.Session.getInstance(new java.util.Properties()));
        when(sender.createMimeMessage()).thenReturn(message);
        doThrow(new MailSendException("offline")).doNothing().when(sender).send(message);

        assertThat(mail.sendPending()).isZero();
        verify(deliveries, never()).markSent(any(), any(), any());
        assertThat(mail.sendPending()).isEqualTo(1);
        verify(deliveries).markSent(tenant, id, clock.instant());
        String body = (String) message.getContent();
        assertThat(body).contains("/employees/" + recipient + "?tab=documents")
                .doesNotContain("salary", "PRIVATE-NUMBER");
    }

    @Test
    void lockedAccountIsSkippedWithoutLeakingAnEmail() {
        when(legalEntity.id()).thenReturn(tenant);
        when(deliveries.lockPending(tenant, 100)).thenReturn(List.of(new ExpiryDeliveryRepository.Pending(id,
                recipient, "/employees/" + recipient)));
        when(accounts.emailOfEmployee(recipient)).thenReturn(Optional.empty());

        assertThat(mail.sendPending()).isZero();
        verify(deliveries).markSent(tenant, id, clock.instant());
        verifyNoInteractions(sender);
    }
}
