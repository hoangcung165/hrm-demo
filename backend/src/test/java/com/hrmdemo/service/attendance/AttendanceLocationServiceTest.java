package com.hrmdemo.service.attendance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
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

import com.hrmdemo.dto.attendance.AttendanceLocationRequest;
import com.hrmdemo.dto.attendance.AttendanceLocationResponse;
import com.hrmdemo.dto.attendance.MobileCheckinSettingsRequest;
import com.hrmdemo.entity.attendance.AttendanceLocation;
import com.hrmdemo.entity.attendance.MobileCheckinSetting;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.attendance.AttendanceLocationRepository;
import com.hrmdemo.repository.attendance.MobileCheckinConsentRepository;
import com.hrmdemo.repository.attendance.MobileCheckinSettingRepository;
import com.hrmdemo.repository.attendance.PunchRepository;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.accessscope.ManagedOrgUnits;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

/** Địa điểm chấm công and the rules of mobile check-in: permission, validation and the Audit log. */
class AttendanceLocationServiceTest {

    static final Instant NOW = Instant.parse("2026-11-03T03:00:00Z");
    static final CurrentAccount HR = new CurrentAccount(UUID.randomUUID(), Set.of("HR"));
    static final CurrentAccount DIRECTOR = new CurrentAccount(UUID.randomUUID(), Set.of("DIRECTOR"));
    static final CurrentAccount EMPLOYEE = new CurrentAccount(UUID.randomUUID(), Set.of("EMPLOYEE"));

    AttendanceLocationRepository locations = mock(AttendanceLocationRepository.class);
    MobileCheckinSettingRepository settings = mock(MobileCheckinSettingRepository.class);
    AuditRecorder audit = mock(AuditRecorder.class);
    AttendanceLocationService service;
    MobileCheckinSettingsService rules;

    @BeforeEach
    void setUp() {
        AccessScopeService scopes = new AccessScopeService(mock(ManagedOrgUnits.class));
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
        service = new AttendanceLocationService(locations, mock(PunchRepository.class), scopes, audit, clock);
        rules = new MobileCheckinSettingsService(settings, mock(MobileCheckinConsentRepository.class),
                mock(AccountRepository.class), scopes, audit, clock);
        when(locations.save(any(AttendanceLocation.class))).thenAnswer(call -> call.getArgument(0));
        when(settings.save(any(MobileCheckinSetting.class))).thenAnswer(call -> call.getArgument(0));
    }

    static AttendanceLocationRequest hoaLac() {
        return new AttendanceLocationRequest("  Trung tâm dữ liệu Hòa Lạc ", " ", 21.009, 105.529, 200);
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, String>> errorsOf(Runnable call) {
        try {
            call.run();
        } catch (ApiException e) {
            assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(e.getCode()).isEqualTo("validation.invalid");
            return (List<Map<String, String>>) e.getProperties().get("errors");
        }
        throw new AssertionError("No validation error");
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static ArgumentCaptor<Map<String, Object>> captor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(Map.class);
    }

    @Test
    void hrAddsALocationWithItsNameTrimmedAndItIsAudited() {
        AttendanceLocationResponse added = service.create(HR, hoaLac());

        assertThat(added.name()).isEqualTo("Trung tâm dữ liệu Hòa Lạc");
        assertThat(added.address()).isNull();
        assertThat(added.radiusMeters()).isEqualTo(200);
        assertThat(added.active()).isTrue();
        ArgumentCaptor<Map<String, Object>> after = captor();
        verify(audit).record(eq(HR), eq(AuditRegistrations.ATTENDANCE_LOCATION), any(), eq(AuditAction.CREATE),
                eq("Check-in location Trung tâm dữ liệu Hòa Lạc added"), isNull(), after.capture());
        assertThat(after.getValue()).containsEntry("latitude", 21.009).containsEntry("radiusMeters", 200)
                .containsEntry("active", true);
    }

    @Test
    void onlyAnAccountWithTheSettingsPermissionReadsOrChanges() {
        for (CurrentAccount other : List.of(DIRECTOR, EMPLOYEE)) {
            assertThatThrownBy(() -> service.create(other, hoaLac())).isInstanceOf(ApiException.class)
                    .extracting(e -> ((ApiException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
            assertThatThrownBy(() -> service.list(other, null)).isInstanceOf(ApiException.class);
            assertThatThrownBy(() -> rules.get(other)).isInstanceOf(ApiException.class);
            assertThatThrownBy(() -> rules.update(other, new MobileCheckinSettingsRequest(50)))
                    .isInstanceOf(ApiException.class);
        }
        verify(locations, never()).save(any());
    }

    @Test
    void everyFailingFieldIsReportedAtOnce() {
        List<Map<String, String>> errors = errorsOf(() -> service.create(HR,
                new AttendanceLocationRequest(" ", "x".repeat(256), 90.5, Double.NaN, 1001)));

        assertThat(errors).containsExactly(Map.of("field", "name", "code", "required"),
                Map.of("field", "address", "code", "too_long"),
                Map.of("field", "latitude", "code", "out_of_range"),
                Map.of("field", "longitude", "code", "out_of_range"),
                Map.of("field", "radiusMeters", "code", "out_of_range"));
        assertThat(errorsOf(() -> service.create(HR, null))).extracting(e -> e.get("field"))
                .containsExactly("name", "latitude", "longitude", "radiusMeters");
        assertThat(errorsOf(() -> service.create(HR,
                new AttendanceLocationRequest("x".repeat(101), null, 0d, 0d, 49))))
                .containsExactly(Map.of("field", "name", "code", "too_long"),
                        Map.of("field", "radiusMeters", "code", "out_of_range"));
        verify(audit, never()).record(any(), anyString(), any(), any(), anyString(), any(), any());
    }

    @Test
    void theRadiusBoundsAreIncluded() {
        assertThat(service.create(HR, new AttendanceLocationRequest("A", null, -90d, -180d, 50)).radiusMeters())
                .isEqualTo(50);
        assertThat(service.create(HR, new AttendanceLocationRequest("B", null, 90d, 180d, 1000)).radiusMeters())
                .isEqualTo(1000);
    }

    @Test
    void aNameTakenByAnotherPlaceIsRefusedButAPlaceKeepsItsOwn() {
        when(locations.existsByNameIgnoreCase("Văn phòng chính")).thenReturn(true);
        assertThat(errorsOf(() -> service.create(HR, new AttendanceLocationRequest("Văn phòng chính", null, 21d,
                105d, 150)))).containsExactly(Map.of("field", "name", "code", "taken"));

        AttendanceLocation own = new AttendanceLocation("Văn phòng chính", null, 21, 105, 150, NOW);
        UUID id = UUID.randomUUID();
        when(locations.findById(id)).thenReturn(Optional.of(own));
        when(locations.existsByNameIgnoreCaseAndIdNot("Văn phòng chính", id)).thenReturn(false);

        assertThat(service.update(HR, id, new AttendanceLocationRequest("Văn phòng chính", null, 21d, 105d, 300))
                .radiusMeters()).isEqualTo(300);
    }

    @Test
    void aChangeIsAuditedWithItsValuesBeforeAndAfter() {
        AttendanceLocation location = new AttendanceLocation("Hòa Lạc", null, 21.009, 105.529, 200, NOW);
        UUID id = UUID.randomUUID();
        when(locations.findById(id)).thenReturn(Optional.of(location));

        service.update(HR, id, new AttendanceLocationRequest("Hòa Lạc", "Thạch Thất", 21.009, 105.529, 250));
        service.deactivate(HR, id);

        ArgumentCaptor<Map<String, Object>> before = captor();
        ArgumentCaptor<Map<String, Object>> after = captor();
        verify(audit, org.mockito.Mockito.times(2)).record(eq(HR), eq(AuditRegistrations.ATTENDANCE_LOCATION),
                any(), eq(AuditAction.UPDATE), anyString(), before.capture(), after.capture());
        assertThat(before.getAllValues().get(0)).containsEntry("radiusMeters", 200).containsEntry("address", null);
        assertThat(after.getAllValues().get(0)).containsEntry("radiusMeters", 250)
                .containsEntry("address", "Thạch Thất");
        assertThat(after.getAllValues().get(1)).containsEntry("active", false);
        assertThat(location.isActive()).isFalse();
    }

    @Test
    void anUnknownPlaceIsNotFound() {
        assertThatThrownBy(() -> service.get(HR, UUID.randomUUID())).isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).getCode()).isEqualTo("attendance_location.not_found");
    }

    // ----- Rules of mobile check-in -----

    @Test
    void theRulesAreTheDefaultUntilTheCompanySavesItsOwn() {
        assertThat(rules.maxAccuracyMeters()).isEqualTo(100);
        assertThat(rules.get(HR).customized()).isFalse();

        when(settings.findFirstBy()).thenReturn(Optional.of(new MobileCheckinSetting(40, HR.id(), NOW)));
        assertThat(rules.maxAccuracyMeters()).isEqualTo(40);
        assertThat(rules.get(HR).customized()).isTrue();
        assertThat(rules.get(HR).defaultMaxAccuracyMeters()).isEqualTo(100);
    }

    @Test
    void savingTheRulesIsAuditedFromTheValueInForce() {
        rules.update(HR, new MobileCheckinSettingsRequest(50));

        verify(audit).recordCompanyWide(eq(HR), eq(AuditRegistrations.MOBILE_CHECKIN_SETTING),
                eq(AuditAction.UPDATE), anyString(), eq(Map.of("maxAccuracyMeters", 100)),
                eq(Map.of("maxAccuracyMeters", 50)));
    }

    @ParameterizedTest
    @ValueSource(ints = {9, 1001})
    void theMaximumAccuracyIsBetween10And1000Metres(int value) {
        assertThat(errorsOf(() -> rules.update(HR, new MobileCheckinSettingsRequest(value))))
                .containsExactly(Map.of("field", "maxAccuracyMeters", "code", "out_of_range"));
        assertThat(errorsOf(() -> rules.update(HR, new MobileCheckinSettingsRequest(null))))
                .containsExactly(Map.of("field", "maxAccuracyMeters", "code", "required"));
        verify(audit, never()).recordCompanyWide(any(), anyString(), any(), anyString(), anyMap(), anyMap());
    }
}
