package com.hrmdemo.service.shift;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.shift.ShiftRequest;
import com.hrmdemo.dto.shift.ShiftResponse;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.shift.RoundingMode;
import com.hrmdemo.entity.shift.Shift;
import com.hrmdemo.entity.shift.ShiftPattern;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.shift.ShiftRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.accessscope.ManagedOrgUnits;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

class ShiftServiceTest {

    static final Instant NOW = Instant.parse("2026-10-18T02:00:00Z");
    static final CurrentAccount HR = new CurrentAccount(UUID.randomUUID(), Set.of("HR"));
    static final CurrentAccount DIRECTOR = new CurrentAccount(UUID.randomUUID(), Set.of("DIRECTOR"));
    static final CurrentAccount LINE_MANAGER = new CurrentAccount(UUID.randomUUID(), Set.of("LINE_MANAGER"));
    static final CurrentAccount EMPLOYEE = new CurrentAccount(UUID.randomUUID(), Set.of("EMPLOYEE"));

    ShiftRepository repository = mock(ShiftRepository.class);
    AuditRecorder audit = mock(AuditRecorder.class);
    ShiftService service;

    @BeforeEach
    void setUp() {
        service = new ShiftService(repository, new AccessScopeService(mock(ManagedOrgUnits.class)), audit,
                Clock.fixed(NOW, ZoneOffset.UTC));
        when(repository.save(any(Shift.class))).thenAnswer(call -> call.getArgument(0));
    }

    static ShiftRequest day() {
        return new ShiftRequest("hc", "Hành chính", LocalTime.of(8, 0), LocalTime.of(17, 0), LocalTime.of(12, 0),
                LocalTime.of(13, 0), 10, 5, "NEAREST", 15);
    }

    static ShiftRequest with(ShiftRequest base, String code, String name, LocalTime start, LocalTime end,
            LocalTime breakStart, LocalTime breakEnd, Integer late, Integer early, String mode, Integer step) {
        return new ShiftRequest(code, name, start, end, breakStart, breakEnd, late, early, mode, step);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static ArgumentCaptor<Map<String, Object>> captor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(Map.class);
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, String>> errorsOf(ApiException e) {
        assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(e.getCode()).isEqualTo("validation.invalid");
        return (List<Map<String, String>>) e.getProperties().get("errors");
    }

    static List<Map<String, String>> errorsFor(ShiftRequest request) {
        List<Map<String, String>> errors = new ArrayList<>();
        ShiftService.pattern(request, errors);
        return errors;
    }

    @Test
    void hrAddsAShiftWithTheCodeInCapitalsAndItIsAudited() {
        ShiftResponse response = service.create(HR, day());

        assertThat(response.code()).isEqualTo("HC");
        assertThat(response.active()).isTrue();
        assertThat(response.scheduledMinutes()).isEqualTo(480);
        assertThat(response.crossesMidnight()).isFalse();
        ArgumentCaptor<Map<String, Object>> after = captor();
        verify(audit).record(eq(HR), eq(AuditRegistrations.SHIFT), any(), eq(AuditAction.CREATE),
                eq("Shift HC added"), isNull(), after.capture());
        assertThat(after.getValue()).containsEntry("code", "HC").containsEntry("startTime", "08:00")
                .containsEntry("roundingMode", "NEAREST").containsEntry("roundingMinutes", 15)
                .containsEntry("active", true);
    }

    @Test
    void aTakenCodeIsRefusedWhateverItsCase() {
        when(repository.existsByCodeIgnoreCase("hc")).thenReturn(true);

        assertThatThrownBy(() -> service.create(HR, day())).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(errorsOf(e)).containsExactly(Map.of("field", "code", "code", "taken")));
        verify(repository, never()).save(any());
    }

    @Test
    void theDirectorReadsButCannotChangeAndAnEmployeeCannotRead() {
        when(repository.findAllByOrderByStartTimeAscNameAsc()).thenReturn(List.of());

        assertThat(service.list(DIRECTOR, null)).isEmpty();
        assertThatThrownBy(() -> service.create(DIRECTOR, day())).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        assertThatThrownBy(() -> service.create(LINE_MANAGER, day())).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        assertThatThrownBy(() -> service.list(EMPLOYEE, null)).isInstanceOfSatisfying(ApiException.class,
                e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verify(audit, never()).record(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void aShiftCrossingMidnightIsNamedAsSuch() {
        ShiftResponse response = service.create(HR, with(day(), "DEM", "Ca đêm", LocalTime.of(22, 0),
                LocalTime.of(6, 0), LocalTime.of(1, 0), LocalTime.of(2, 0), 0, 0, "NONE", null));

        assertThat(response.crossesMidnight()).isTrue();
        assertThat(response.scheduledMinutes()).isEqualTo(420);
        assertThat(response.nightMinutes()).isEqualTo(420);
        assertThat(response.roundingMinutes()).isNull();
    }

    @Test
    void startEqualToEndIsRefused() {
        assertThat(errorsFor(with(day(), "X", "X", LocalTime.of(8, 0), LocalTime.of(8, 0), null, null, 0, 0, "NONE",
                null))).containsExactly(Map.of("field", "endTime", "code", "same_as_start"));
    }

    @Test
    void theBreakGoesInPairsInsideTheShiftAndIsNotEmpty() {
        assertThat(errorsFor(with(day(), "X", "X", LocalTime.of(8, 0), LocalTime.of(17, 0), LocalTime.of(12, 0), null,
                0, 0, "NONE", null))).containsExactly(Map.of("field", "breakEnd", "code", "required"));
        assertThat(errorsFor(with(day(), "X", "X", LocalTime.of(8, 0), LocalTime.of(17, 0), LocalTime.of(17, 30),
                LocalTime.of(18, 0), 0, 0, "NONE", null)))
                .containsExactly(Map.of("field", "breakStart", "code", "outside_shift"));
        assertThat(errorsFor(with(day(), "X", "X", LocalTime.of(8, 0), LocalTime.of(17, 0), LocalTime.of(12, 0),
                LocalTime.of(12, 0), 0, 0, "NONE", null)))
                .containsExactly(Map.of("field", "breakStart", "code", "empty"));
    }

    @Test
    void tolerancesAreFrom0To120() {
        assertThat(errorsFor(with(day(), "X", "X", LocalTime.of(8, 0), LocalTime.of(17, 0), null, null, 121, -1,
                "NONE", null))).containsExactly(Map.of("field", "lateToleranceMinutes", "code", "out_of_range"),
                Map.of("field", "earlyToleranceMinutes", "code", "out_of_range"));
        assertThat(errorsFor(with(day(), "X", "X", LocalTime.of(8, 0), LocalTime.of(17, 0), null, null, 120, 0,
                "NONE", null))).isEmpty();
    }

    @Test
    void roundingNeedsAStepOf5And10And15Or30UnlessThereIsNone() {
        assertThat(errorsFor(with(day(), "X", "X", LocalTime.of(8, 0), LocalTime.of(17, 0), null, null, 0, 0, "UP",
                null))).containsExactly(Map.of("field", "roundingMinutes", "code", "required"));
        assertThat(errorsFor(with(day(), "X", "X", LocalTime.of(8, 0), LocalTime.of(17, 0), null, null, 0, 0, "DOWN",
                7))).containsExactly(Map.of("field", "roundingMinutes", "code", "invalid"));
        assertThat(errorsFor(with(day(), "X", "X", LocalTime.of(8, 0), LocalTime.of(17, 0), null, null, 0, 0,
                "SIDEWAYS", 5))).containsExactly(Map.of("field", "roundingMode", "code", "invalid"));
        // A step given with NONE is dropped rather than kept.
        List<Map<String, String>> errors = new ArrayList<>();
        ShiftPattern none = ShiftService.pattern(with(day(), "X", "X", LocalTime.of(8, 0), LocalTime.of(17, 0), null,
                null, 0, 0, "NONE", 15), errors);
        assertThat(errors).isEmpty();
        assertThat(none.roundingMode()).isEqualTo(RoundingMode.NONE);
        assertThat(none.roundingMinutes()).isNull();
    }

    @Test
    void theNameAndCodeAreRequired() {
        assertThatThrownBy(() -> service.create(HR, with(day(), " ", " ", null, null, null, null, null, null, null,
                null))).isInstanceOfSatisfying(ApiException.class, e -> assertThat(errorsOf(e)).contains(
                        Map.of("field", "code", "code", "required"), Map.of("field", "name", "code", "required"),
                        Map.of("field", "startTime", "code", "required"),
                        Map.of("field", "endTime", "code", "required")));
    }

    @Test
    void changingAShiftKeepsItsCodeAndRecordsBeforeAndAfter() {
        UUID id = UUID.randomUUID();
        Shift shift = new Shift("HC", pattern(), NOW.minusSeconds(3600));
        when(repository.findById(id)).thenReturn(Optional.of(shift));

        ShiftResponse response = service.update(HR, id, with(day(), "IGNORED", "Hành chính sáng", LocalTime.of(7, 30),
                LocalTime.of(16, 30), LocalTime.of(11, 30), LocalTime.of(12, 30), 15, 15, "UP", 30));

        assertThat(response.code()).isEqualTo("HC");
        assertThat(response.name()).isEqualTo("Hành chính sáng");
        ArgumentCaptor<Map<String, Object>> before = captor();
        ArgumentCaptor<Map<String, Object>> after = captor();
        verify(audit).record(eq(HR), eq(AuditRegistrations.SHIFT), any(), eq(AuditAction.UPDATE),
                eq("Shift HC changed"), before.capture(), after.capture());
        assertThat(before.getValue()).containsEntry("name", "Hành chính").containsEntry("startTime", "08:00");
        assertThat(after.getValue()).containsEntry("name", "Hành chính sáng").containsEntry("startTime", "07:30")
                .containsEntry("roundingMinutes", 30);
    }

    @Test
    void aShiftIsTurnedOffAndBackOnAndNeverDeleted() {
        UUID id = UUID.randomUUID();
        Shift shift = new Shift("HC", pattern(), NOW);
        when(repository.findById(id)).thenReturn(Optional.of(shift));

        assertThat(service.deactivate(HR, id).active()).isFalse();
        assertThat(service.reactivate(HR, id).active()).isTrue();

        verify(audit).record(eq(HR), eq(AuditRegistrations.SHIFT), any(), eq(AuditAction.UPDATE),
                eq("Shift HC turned off"), any(), any());
        verify(audit).record(eq(HR), eq(AuditRegistrations.SHIFT), any(), eq(AuditAction.UPDATE),
                eq("Shift HC turned on"), any(), any());
        verify(repository, never()).delete(any());
        verify(repository, never()).deleteById(any());
    }

    @Test
    void anUnknownShiftIsNotFound() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(HR, id)).isInstanceOfSatisfying(ApiException.class, e -> {
            assertThat(e.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
            assertThat(e.getCode()).isEqualTo("shift.not_found");
        });
    }

    static ShiftPattern pattern() {
        return new ShiftPattern("Hành chính", LocalTime.of(8, 0), LocalTime.of(17, 0), LocalTime.of(12, 0),
                LocalTime.of(13, 0), 10, 5, RoundingMode.NEAREST, 15);
    }
}
