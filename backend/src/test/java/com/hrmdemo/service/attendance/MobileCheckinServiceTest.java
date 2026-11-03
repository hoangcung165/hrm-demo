package com.hrmdemo.service.attendance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.attendance.MobileCheckinResponse;
import com.hrmdemo.entity.attendance.AttendanceLocation;
import com.hrmdemo.entity.attendance.MobileCheckinConsent;
import com.hrmdemo.entity.attendance.Punch;
import com.hrmdemo.entity.attendance.PunchPhoto;
import com.hrmdemo.entity.attendance.PunchSource;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.attendance.AttendanceLocationRepository;
import com.hrmdemo.repository.attendance.MobileCheckinConsentRepository;
import com.hrmdemo.repository.attendance.PunchPhotoRepository;
import com.hrmdemo.repository.attendance.PunchRepository;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import com.hrmdemo.support.MutableClock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

/** Mobile check-in: consent first, the server's time, the photo and position checks, nothing stored when refused. */
class MobileCheckinServiceTest {

    /** 07:58:41.123 in Hà Nội. */
    static final Instant NOW = Instant.parse("2026-11-03T00:58:41.123Z");
    static final UUID AN = UUID.randomUUID();
    static final CurrentAccount AN_ACCOUNT = new CurrentAccount(UUID.randomUUID(), AN, Set.of("EMPLOYEE"));
    static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16, 'J', 'F', 'I', 'F'};
    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0};
    static final double HOA_LAC_LAT = 21.0090;
    static final double HOA_LAC_LON = 105.5290;

    PunchRepository punches = mock(PunchRepository.class);
    PunchPhotoRepository photos = mock(PunchPhotoRepository.class);
    MobileCheckinConsentRepository consents = mock(MobileCheckinConsentRepository.class);
    AttendanceLocationRepository locations = mock(AttendanceLocationRepository.class);
    EmployeeRepository employees = mock(EmployeeRepository.class);
    MobileCheckinSettingsService settings = mock(MobileCheckinSettingsService.class);
    AuditRecorder audit = mock(AuditRecorder.class);
    MutableClock clock = new MutableClock(NOW);
    MobileCheckinService service;
    AttendanceLocation hoaLac;

    @BeforeEach
    void setUp() {
        service = new MobileCheckinService(punches, photos, consents, locations, employees, settings,
                mock(DailyAttendanceService.class), audit, clock);
        Employee an = mock(Employee.class);
        when(an.isActive()).thenReturn(true);
        when(employees.findById(AN)).thenReturn(Optional.of(an));
        when(settings.maxAccuracyMeters()).thenReturn(100);
        hoaLac = new AttendanceLocation("Trung tâm dữ liệu Hòa Lạc", null, HOA_LAC_LAT, HOA_LAC_LON, 200, NOW);
        when(locations.findAllByActiveOrderByNameAsc(true)).thenReturn(List.of(hoaLac));
        when(punches.save(any(Punch.class))).thenAnswer(call -> call.getArgument(0));
        when(consents.save(any(MobileCheckinConsent.class))).thenAnswer(call -> call.getArgument(0));
    }

    void consented() {
        when(consents.findByEmployeeId(AN)).thenReturn(Optional.of(new MobileCheckinConsent(AN,
                MobileCheckinService.NOTICE_VERSION, NOW.minusSeconds(3600))));
    }

    static ApiException refusal(Runnable call) {
        try {
            call.run();
        } catch (ApiException e) {
            return e;
        }
        throw new AssertionError("Not refused");
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, String>> errors(ApiException e) {
        assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        return (List<Map<String, String>>) e.getProperties().get("errors");
    }

    void nothingStored() {
        verify(punches, never()).save(any());
        verify(photos, never()).save(any());
        verify(audit, never()).record(any(), eq(AuditRegistrations.MOBILE_CHECKIN), any(), any(), anyString(), any(),
                any());
    }

    @Test
    void aCheckInInsideThePlaceIsStoredAtTheServerSecondWithItsPhoto() {
        consented();

        MobileCheckinResponse.Punch line = service.checkIn(AN_ACCOUNT, JPEG, HOA_LAC_LAT, HOA_LAC_LON, 12.5);

        ArgumentCaptor<Punch> saved = ArgumentCaptor.forClass(Punch.class);
        verify(punches).save(saved.capture());
        Punch punch = saved.getValue();
        assertThat(punch.getPunchedAt()).isEqualTo(Instant.parse("2026-11-03T00:58:41Z"));
        assertThat(punch.getSource()).isEqualTo(PunchSource.MOBILE);
        assertThat(punch.getEmployeeId()).isEqualTo(AN);
        assertThat(punch.getDistanceMeters()).isZero();
        assertThat(punch.isOutsideLocation()).isFalse();
        assertThat(punch.isLowAccuracy()).isFalse();
        assertThat(punch.getAccuracyMeters()).isEqualTo(12.5);
        ArgumentCaptor<PunchPhoto> photo = ArgumentCaptor.forClass(PunchPhoto.class);
        verify(photos).save(photo.capture());
        assertThat(photo.getValue().getContentType()).isEqualTo("image/jpeg");
        assertThat(photo.getValue().getContent()).isEqualTo(JPEG);
        assertThat(line.source()).isEqualTo("MOBILE");
        assertThat(line.hasPhoto()).isTrue();
        assertThat(line.at().toString()).isEqualTo("2026-11-03T07:58:41+07:00");
    }

    @Test
    void outsideThePlaceAndWithLowAccuracyItIsStillStoredButMarked() {
        consented();

        service.checkIn(AN_ACCOUNT, PNG, HOA_LAC_LAT + 1_400 / 111_195.0, HOA_LAC_LON, 250.0);

        ArgumentCaptor<Punch> saved = ArgumentCaptor.forClass(Punch.class);
        verify(punches).save(saved.capture());
        assertThat(saved.getValue().isOutsideLocation()).isTrue();
        assertThat(saved.getValue().isLowAccuracy()).isTrue();
        assertThat(saved.getValue().getDistanceMeters()).isEqualTo(1_400);
        assertThat(saved.getValue().getLocationId()).isEqualTo(hoaLac.getId());
    }

    @Test
    void theCheckInIsAuditedWithThePlaceButWithoutTheCoordinates() {
        consented();

        service.checkIn(AN_ACCOUNT, JPEG, HOA_LAC_LAT, HOA_LAC_LON, 12.5);

        @SuppressWarnings({"unchecked", "rawtypes"})
        ArgumentCaptor<Map<String, Object>> after = (ArgumentCaptor) ArgumentCaptor.forClass(Map.class);
        verify(audit).record(eq(AN_ACCOUNT), eq(AuditRegistrations.MOBILE_CHECKIN), any(), eq(AuditAction.CREATE),
                eq("Mobile check-in"), isNull(), after.capture());
        assertThat(after.getValue()).containsEntry("location", "Trung tâm dữ liệu Hòa Lạc")
                .containsEntry("distanceMeters", 0).containsEntry("outsideLocation", false)
                .containsEntry("punchedAt", "2026-11-03T00:58:41Z")
                .doesNotContainKeys("latitude", "longitude");
    }

    @Test
    void withoutConsentNothingIsStored() {
        ApiException refused = refusal(() -> service.checkIn(AN_ACCOUNT, JPEG, HOA_LAC_LAT, HOA_LAC_LON, 10.0));

        assertThat(refused.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(refused.getCode()).isEqualTo("mobile_checkin.consent_required");
        nothingStored();
    }

    @Test
    void aWithdrawnOrOutdatedConsentIsNoConsent() {
        MobileCheckinConsent withdrawn = new MobileCheckinConsent(AN, MobileCheckinService.NOTICE_VERSION, NOW);
        withdrawn.withdraw(NOW);
        when(consents.findByEmployeeId(AN)).thenReturn(Optional.of(withdrawn));
        assertThat(refusal(() -> service.checkIn(AN_ACCOUNT, JPEG, 21d, 105d, 10d)).getCode())
                .isEqualTo("mobile_checkin.consent_required");

        when(consents.findByEmployeeId(AN)).thenReturn(Optional.of(new MobileCheckinConsent(AN,
                MobileCheckinService.NOTICE_VERSION - 1, NOW)));
        assertThat(service.consent(AN_ACCOUNT).accepted()).isFalse();
        nothingStored();
    }

    @Test
    void aMissingOrFakePhotoAndAMissingPositionAreRefusedTogether() {
        consented();

        ApiException noPhoto = refusal(() -> service.checkIn(AN_ACCOUNT, null, null, 181d, -1d));
        assertThat(errors(noPhoto)).containsExactly(Map.of("field", "photo", "code", "required"),
                Map.of("field", "latitude", "code", "required"),
                Map.of("field", "longitude", "code", "out_of_range"),
                Map.of("field", "accuracyMeters", "code", "out_of_range"));

        byte[] pdf = {'%', 'P', 'D', 'F', '-', '1'};
        assertThat(errors(refusal(() -> service.checkIn(AN_ACCOUNT, pdf, 21d, 105d, 10d))))
                .containsExactly(Map.of("field", "photo", "code", "unsupported"));
        assertThat(errors(refusal(() -> service.checkIn(AN_ACCOUNT, JPEG, 21d, 105d, Double.NaN))))
                .containsExactly(Map.of("field", "accuracyMeters", "code", "out_of_range"));
        nothingStored();
    }

    @Test
    void aSecondPunchInTheSameSecondIsRefused() {
        consented();
        when(punches.existsByEmployeeIdAndPunchedAt(AN, Instant.parse("2026-11-03T00:58:41Z"))).thenReturn(true);

        ApiException refused = refusal(() -> service.checkIn(AN_ACCOUNT, JPEG, HOA_LAC_LAT, HOA_LAC_LON, 10d));

        assertThat(refused.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(refused.getCode()).isEqualTo("mobile_checkin.duplicate");
        nothingStored();
    }

    @Test
    void anAccountWithoutAnActiveEmployeeCannotCheckIn() {
        CurrentAccount admin = new CurrentAccount(UUID.randomUUID(), null, Set.of("ADMIN"));
        assertThat(refusal(() -> service.checkIn(admin, JPEG, 21d, 105d, 10d)).getCode())
                .isEqualTo("mobile_checkin.no_employee");

        Employee left = mock(Employee.class);
        UUID leftId = UUID.randomUUID();
        when(employees.findById(leftId)).thenReturn(Optional.of(left));
        CurrentAccount former = new CurrentAccount(UUID.randomUUID(), leftId, Set.of("EMPLOYEE"));
        assertThat(refusal(() -> service.consent(former)).getCode()).isEqualTo("mobile_checkin.employee_inactive");
        nothingStored();
    }

    @Test
    void locatingStoresNothingAndNeedsTheConsent() {
        assertThat(refusal(() -> service.locate(AN_ACCOUNT, HOA_LAC_LAT, HOA_LAC_LON, 10d)).getCode())
                .isEqualTo("mobile_checkin.consent_required");
        consented();

        MobileCheckinResponse.Located located = service.locate(AN_ACCOUNT, HOA_LAC_LAT, HOA_LAC_LON, 150d);

        assertThat(located.location().name()).isEqualTo("Trung tâm dữ liệu Hòa Lạc");
        assertThat(located.outsideLocation()).isFalse();
        assertThat(located.lowAccuracy()).isTrue();
        assertThat(located.maxAccuracyMeters()).isEqualTo(100);
        nothingStored();
    }

    // ----- Consent -----

    @Test
    void acceptingStoresTheDateAndIsAuditedOnce() {
        MobileCheckinResponse.Consent consent = service.accept(AN_ACCOUNT, MobileCheckinService.NOTICE_VERSION);

        assertThat(consent.accepted()).isTrue();
        assertThat(consent.acceptedAt()).isEqualTo(NOW);
        verify(audit).record(eq(AN_ACCOUNT), eq(AuditRegistrations.MOBILE_CHECKIN_CONSENT), any(),
                eq(AuditAction.CREATE), eq("Mobile check-in consent accepted"), isNull(), any());

        consented();
        service.accept(AN_ACCOUNT, MobileCheckinService.NOTICE_VERSION);
        verify(consents).save(any());
    }

    @Test
    void anOutdatedOrMissingNoticeVersionIsRefused() {
        assertThat(errors(refusal(() -> service.accept(AN_ACCOUNT, 0))))
                .containsExactly(Map.of("field", "noticeVersion", "code", "outdated"));
        assertThat(errors(refusal(() -> service.accept(AN_ACCOUNT, null))))
                .containsExactly(Map.of("field", "noticeVersion", "code", "required"));
        verifyNoInteractions(audit);
    }

    @Test
    void withdrawingKeepsTheRowAndAcceptingAgainStartsANewDate() {
        MobileCheckinConsent consent = new MobileCheckinConsent(AN, MobileCheckinService.NOTICE_VERSION,
                NOW.minusSeconds(86_400));
        when(consents.findByEmployeeId(AN)).thenReturn(Optional.of(consent));

        MobileCheckinResponse.Consent withdrawn = service.withdraw(AN_ACCOUNT);
        assertThat(withdrawn.accepted()).isFalse();
        assertThat(withdrawn.withdrawnAt()).isEqualTo(NOW);
        assertThat(withdrawn.acceptedAt()).isEqualTo(NOW.minusSeconds(86_400));

        clock.set(NOW.plusSeconds(60));
        MobileCheckinResponse.Consent again = service.accept(AN_ACCOUNT, MobileCheckinService.NOTICE_VERSION);
        assertThat(again.accepted()).isTrue();
        assertThat(again.acceptedAt()).isEqualTo(NOW.plusSeconds(60));
        assertThat(again.withdrawnAt()).isNull();
        verify(audit, org.mockito.Mockito.times(2)).record(eq(AN_ACCOUNT),
                eq(AuditRegistrations.MOBILE_CHECKIN_CONSENT), any(), eq(AuditAction.UPDATE), anyString(), any(),
                any());
    }

    @Test
    void withdrawingWithoutAConsentChangesNothing() {
        assertThat(service.withdraw(AN_ACCOUNT).accepted()).isFalse();
        verifyNoInteractions(audit);
        assertThatThrownBy(() -> service.checkIn(AN_ACCOUNT, JPEG, 21d, 105d, 5d)).isInstanceOf(ApiException.class);
    }
}
