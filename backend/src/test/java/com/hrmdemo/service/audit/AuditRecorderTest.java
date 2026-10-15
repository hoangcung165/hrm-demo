package com.hrmdemo.service.audit;

import static com.hrmdemo.service.audit.AuditedType.field;
import static com.hrmdemo.service.audit.AuditedType.masked;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.audit.AuditLog;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.repository.audit.AuditLogRepository;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.security.CurrentAccount;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class AuditRecorderTest {

    static final Instant NOW = Instant.parse("2026-10-15T04:00:00Z");
    static final UUID COMPANY_ID = UUID.randomUUID();
    static final UUID ENTITY_ID = UUID.randomUUID();
    static final CurrentAccount ACTOR = new CurrentAccount(UUID.randomUUID(), Set.of("ADMIN"));

    AuditLogRepository records = mock(AuditLogRepository.class);
    AccountRepository accounts = mock(AccountRepository.class);
    CurrentLegalEntity legalEntity = mock(CurrentLegalEntity.class);
    AuditRecorder recorder;

    @BeforeEach
    void setUp() {
        AuditRegistry registry = new AuditRegistry(List.of(
                new AuditedType("PAY_GRADE", "Pay grade", List.of(field("title"), field("amount"), masked("bankNo")))));
        recorder = new AuditRecorder(registry, records, accounts, legalEntity, Clock.fixed(NOW, ZoneOffset.UTC));
        when(accounts.findById(ACTOR.id()))
                .thenReturn(Optional.of(new Account("admin@example.com", "Nguyễn Văn An", "hash", NOW)));
        when(legalEntity.id()).thenReturn(COMPANY_ID);
    }

    AuditLog saved() {
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(records).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void anUpdateKeepsWhoWhenAndOnlyTheChangedFieldsBeforeAndAfter() {
        recorder.record(ACTOR, "PAY_GRADE", ENTITY_ID, AuditAction.UPDATE, "Pay grade changed",
                Map.of("title", "Senior", "amount", 100), Map.of("title", "Senior", "amount", 120));

        AuditLog record = saved();
        assertThat(record.getActorId()).isEqualTo(ACTOR.id());
        assertThat(record.getActorName()).isEqualTo("Nguyễn Văn An");
        assertThat(record.getOccurredAt()).isEqualTo(NOW);
        assertThat(record.getAction()).isEqualTo(AuditAction.UPDATE);
        assertThat(record.getEntityType()).isEqualTo("PAY_GRADE");
        assertThat(record.getEntityId()).isEqualTo(ENTITY_ID);
        assertThat(record.getSummary()).isEqualTo("Pay grade changed");
        assertThat(record.getBeforeValues()).isEqualTo(Map.of("amount", 100));
        assertThat(record.getAfterValues()).isEqualTo(Map.of("amount", 120));
    }

    @Test
    void anUpdateThatChangesNothingWritesNothing() {
        recorder.record(ACTOR, "PAY_GRADE", ENTITY_ID, AuditAction.UPDATE, "Pay grade changed",
                Map.of("title", "Senior", "amount", 100), Map.of("title", "Senior", "amount", 100));

        verify(records, never()).save(any());
    }

    @Test
    void fieldsThatAreNotRegisteredAreDropped() {
        recorder.record(ACTOR, "PAY_GRADE", ENTITY_ID, AuditAction.UPDATE, "Pay grade changed",
                Map.of("title", "Senior", "internalNote", "a"), Map.of("title", "Lead", "internalNote", "b"));

        AuditLog record = saved();
        assertThat(record.getBeforeValues()).isEqualTo(Map.of("title", "Senior"));
        assertThat(record.getAfterValues()).isEqualTo(Map.of("title", "Lead"));
    }

    @Test
    void aCreateHasNoBeforeAndADeleteHasNoAfter() {
        recorder.record(ACTOR, "PAY_GRADE", ENTITY_ID, AuditAction.CREATE, "Pay grade added", null,
                Map.of("title", "Senior", "amount", 100));
        AuditLog created = saved();
        assertThat(created.getBeforeValues()).isNull();
        assertThat(created.getAfterValues()).isEqualTo(Map.of("title", "Senior", "amount", 100));
    }

    @Test
    void aDeleteKeepsTheValuesItHad() {
        recorder.record(ACTOR, "PAY_GRADE", ENTITY_ID, AuditAction.DELETE, "Pay grade removed",
                Map.of("title", "Senior"), null);

        AuditLog record = saved();
        assertThat(record.getBeforeValues()).isEqualTo(Map.of("title", "Senior"));
        assertThat(record.getAfterValues()).isNull();
    }

    @Test
    void aMaskedFieldIsRecordedAsChangedButNeverWithItsValue() {
        Map<String, Object> before = new HashMap<>();
        before.put("bankNo", "0123456789");
        Map<String, Object> after = new HashMap<>();
        after.put("bankNo", "9876543210");

        recorder.record(ACTOR, "PAY_GRADE", ENTITY_ID, AuditAction.UPDATE, "Bank account changed", before, after);

        AuditLog record = saved();
        assertThat(record.getBeforeValues()).isEqualTo(Map.of("bankNo", AuditedType.MASK));
        assertThat(record.getAfterValues()).isEqualTo(Map.of("bankNo", AuditedType.MASK));
        assertThat(record.getBeforeValues().toString()).doesNotContain("0123456789");
        assertThat(record.getAfterValues().toString()).doesNotContain("9876543210");
    }

    @Test
    void aRecordForTheWholeCompanyUsesTheLegalEntityId() {
        recorder.recordCompanyWide(ACTOR, "PAY_GRADE", AuditAction.UPDATE, "Pay grade changed",
                Map.of("amount", 1), Map.of("amount", 2));

        assertThat(saved().getEntityId()).isEqualTo(COMPANY_ID);
    }

    @Test
    void aKindThatIsNotRegisteredIsRefused() {
        assertThatThrownBy(() -> recorder.record(ACTOR, "UNKNOWN", ENTITY_ID, AuditAction.UPDATE, "x", Map.of(),
                Map.of())).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("UNKNOWN");
        verify(records, never()).save(any());
    }

    @Test
    void registeringTheSameKindTwiceFailsAtStartup() {
        AuditedType type = new AuditedType("PAY_GRADE", "Pay grade", List.of(field("title")));

        assertThatThrownBy(() -> new AuditRegistry(List.of(type, type))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void theRealRegistrationsStartWithTheResourceThresholds() {
        AuditRegistry registry = new AuditRegistry(List.of(new AuditRegistrations().resourceSettingAudit()));

        assertThat(registry.find(AuditRegistrations.RESOURCE_SETTING)).isPresent();
        assertThat(registry.find(AuditRegistrations.RESOURCE_SETTING).orElseThrow().fields())
                .extracting(AuditedType.Field::name).containsExactly("benchPercent", "nearFullPercent", "endingWeeks");
    }
}
