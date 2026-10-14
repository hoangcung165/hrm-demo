package com.hrmdemo.service.resource;

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
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.resource.ResourceSettingsRequest;
import com.hrmdemo.dto.resource.ResourceSettingsResponse;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.resource.ResourceSetting;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.repository.resource.ResourceSettingRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.accessscope.ManagedOrgUnits;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ResourceSettingsServiceTest {

    static final Instant NOW = Instant.parse("2026-10-14T02:30:00Z");
    static final UUID DIRECTOR_ID = UUID.randomUUID();
    static final CurrentAccount ADMIN = new CurrentAccount(UUID.randomUUID(), Set.of("ADMIN"));
    static final CurrentAccount DIRECTOR = new CurrentAccount(DIRECTOR_ID, Set.of("DIRECTOR"));
    static final CurrentAccount PM = new CurrentAccount(UUID.randomUUID(), Set.of("PROJECT_MANAGER"));
    static final CurrentAccount EMPLOYEE = new CurrentAccount(UUID.randomUUID(), Set.of("EMPLOYEE"));

    ResourceSettingRepository repository = mock(ResourceSettingRepository.class);
    AccountRepository accounts = mock(AccountRepository.class);
    ResourceSettingsService service;

    @BeforeEach
    void setUp() {
        AccessScopeService accessScopes = new AccessScopeService(mock(ManagedOrgUnits.class));
        service = new ResourceSettingsService(repository, accounts, accessScopes,
                Clock.fixed(NOW, ZoneOffset.UTC));
        when(repository.findFirstBy()).thenReturn(Optional.empty());
        when(repository.save(any(ResourceSetting.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void withoutOwnThresholdsTheDefaultsAreInForce() {
        ResourceSettingsResponse response = service.get(PM);

        assertThat(response.benchPercent()).isEqualTo(50);
        assertThat(response.nearFullPercent()).isEqualTo(90);
        assertThat(response.endingWeeks()).isEqualTo(4);
        assertThat(response.customized()).isFalse();
        assertThat(response.updatedAt()).isNull();
        assertThat(response.updatedByName()).isNull();
        assertThat(service.current()).isEqualTo(ResourceThresholds.DEFAULTS);
    }

    @Test
    void whoMayEditIsToldToTheViewer() {
        assertThat(service.get(PM).canEdit()).isFalse();
        assertThat(service.get(DIRECTOR).canEdit()).isTrue();
        assertThat(service.get(ADMIN).canEdit()).isTrue();
    }

    @Test
    void anEmployeeCannotReadTheThresholds() {
        assertThatThrownBy(() -> service.get(EMPLOYEE)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void theDirectorSavesNewThresholdsAndTheyAreRecordedWithWhoAndWhen() {
        Account director = new Account("giam.doc@example.com", "Phạm Quốc Bảo", "hash", NOW);
        when(accounts.findById(DIRECTOR_ID)).thenReturn(Optional.of(director));

        ResourceSettingsResponse saved = service.update(DIRECTOR, new ResourceSettingsRequest(40, 85, 6));

        assertThat(saved.benchPercent()).isEqualTo(40);
        assertThat(saved.nearFullPercent()).isEqualTo(85);
        assertThat(saved.endingWeeks()).isEqualTo(6);
        assertThat(saved.customized()).isTrue();
        assertThat(saved.updatedAt()).isEqualTo(NOW);
        assertThat(saved.updatedByName()).isEqualTo("Phạm Quốc Bảo");
        assertThat(saved.canEdit()).isTrue();
    }

    @Test
    void savingAgainChangesTheStoredRow() {
        ResourceSetting stored = new ResourceSetting(40, 85, 6, DIRECTOR_ID, NOW.minusSeconds(3600));
        when(repository.findFirstBy()).thenReturn(Optional.of(stored));

        service.update(ADMIN, new ResourceSettingsRequest(60, 95, 8));

        assertThat(stored.getBenchPercent()).isEqualTo(60);
        assertThat(stored.getNearFullPercent()).isEqualTo(95);
        assertThat(stored.getEndingWeeks()).isEqualTo(8);
        assertThat(stored.getUpdatedAt()).isEqualTo(NOW);
        assertThat(stored.getUpdatedBy()).isEqualTo(ADMIN.id());
    }

    @Test
    void savingTheDefaultsRemovesTheOwnRow() {
        ResourceSetting stored = new ResourceSetting(40, 85, 6, DIRECTOR_ID, NOW);
        when(repository.findFirstBy()).thenReturn(Optional.of(stored));

        ResourceSettingsResponse saved = service.update(DIRECTOR, new ResourceSettingsRequest(50, 90, 4));

        verify(repository).delete(stored);
        verify(repository, never()).save(any());
        assertThat(saved.customized()).isFalse();
    }

    @Test
    void restoringTheDefaultsRemovesTheOwnRow() {
        ResourceSetting stored = new ResourceSetting(40, 85, 6, DIRECTOR_ID, NOW);
        when(repository.findFirstBy()).thenReturn(Optional.of(stored));

        ResourceSettingsResponse restored = service.restoreDefaults(ADMIN);

        verify(repository).delete(stored);
        assertThat(restored.benchPercent()).isEqualTo(50);
        assertThat(restored.customized()).isFalse();
    }

    @Test
    void everyFailingFieldIsReportedAndNothingIsSaved() {
        assertThatThrownBy(() -> service.update(DIRECTOR, new ResourceSettingsRequest(95, 90, 0)))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.getCode()).isEqualTo("validation.invalid");
                    assertThat(e.getProperties().get("errors")).isEqualTo(List.of(
                            Map.of("field", "endingWeeks", "code", "out_of_range"),
                            Map.of("field", "benchPercent", "code", "not_below_near_full")));
                });
        verify(repository, never()).save(any());
    }

    @Test
    void aPmCanReadButNotSaveOrRestore() {
        assertThatThrownBy(() -> service.update(PM, new ResourceSettingsRequest(40, 85, 6)))
                .isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        assertThatThrownBy(() -> service.restoreDefaults(PM)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(repository, never()).save(any());
        verify(repository, never()).delete(any());
    }
}
