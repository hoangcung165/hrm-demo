package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.hrmdemo.dto.employee.ExpiryPolicyRequest;
import com.hrmdemo.dto.employee.ExpiryType;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.employee.ExpiryPolicy;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.ExpiryPolicyRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.accessscope.ManagedOrgUnits;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import com.hrmdemo.service.legalentity.LegalEntityService;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class ExpiryPolicyServiceTest {
    static final Instant NOW = Instant.parse("2026-10-18T01:00:00Z");
    final CurrentAccount admin = new CurrentAccount(UUID.randomUUID(), Set.of("ADMIN"));
    final CurrentAccount hr = new CurrentAccount(UUID.randomUUID(), Set.of("HR"));
    final ExpiryPolicyRepository policies = mock(ExpiryPolicyRepository.class);
    final LegalEntityService legalEntity = mock(LegalEntityService.class);
    final AuditRecorder audit = mock(AuditRecorder.class);
    final ExpiryPolicyService service = new ExpiryPolicyService(policies,
            new AccessScopeService(mock(ManagedOrgUnits.class)), legalEntity, audit, Clock.fixed(NOW, ZoneOffset.UTC));

    @Test
    void savingEveryTypeIncludingBoundaryValuesAuditsBeforeAndAfter() {
        List<ExpiryPolicy> rows = Arrays.stream(ExpiryType.values()).map(t -> new ExpiryPolicy(t, 30, NOW)).toList();
        when(policies.findAll()).thenReturn(rows);
        Map<ExpiryType, Integer> requested = all(14);
        requested.put(ExpiryType.CONTRACT, 0);
        requested.put(ExpiryType.VISA, 365);
        assertThat(service.update(admin, new ExpiryPolicyRequest(requested)).advanceDays()).isEqualTo(requested);
        verify(legalEntity).lockForStructureChange();
        verify(audit).recordCompanyWide(eq(admin), eq(AuditRegistrations.EXPIRY_POLICY), eq(AuditAction.UPDATE),
                anyString(), eq(Map.of("CONTRACT", 30, "PROBATION", 30, "VISA", 30, "WORK_PERMIT", 30, "CERTIFICATE", 30)),
                eq(Map.of("CONTRACT", 0, "PROBATION", 14, "VISA", 365, "WORK_PERMIT", 14, "CERTIFICATE", 14)));
        assertThat(rows).allSatisfy(row -> {
            assertThat(row.getUpdatedBy()).isEqualTo(admin.id());
            assertThat(row.getUpdatedAt()).isEqualTo(NOW);
        });
    }

    @Test
    void hrCanReadButCannotChangeCompanyWidePolicies() {
        when(policies.findAll()).thenReturn(Arrays.stream(ExpiryType.values())
                .map(t -> new ExpiryPolicy(t, 30, NOW)).toList());
        assertThat(service.get(hr).canEdit()).isFalse();
        clearInvocations(policies);
        assertThatThrownBy(() -> service.update(hr, new ExpiryPolicyRequest(all(30))))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(policies, legalEntity, audit);
    }

    @Test
    void incompleteNullAndOutOfRangePoliciesNeverWrite() {
        var invalid = new ArrayList<Map<ExpiryType, Integer>>();
        invalid.add(null);
        invalid.add(Map.of(ExpiryType.CONTRACT, 30));
        for (Integer bad : new Integer[] {null, -1, 366}) {
            var days = all(30);
            days.put(ExpiryType.CERTIFICATE, bad);
            invalid.add(days);
        }
        for (var days : invalid) assertThatThrownBy(() -> service.update(admin, new ExpiryPolicyRequest(days)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getCode()).isEqualTo("expiry.invalid_policy"));
        verifyNoInteractions(policies, legalEntity, audit);
    }

    private static Map<ExpiryType, Integer> all(int days) {
        EnumMap<ExpiryType, Integer> result = new EnumMap<>(ExpiryType.class);
        Arrays.stream(ExpiryType.values()).forEach(t -> result.put(t, days));
        return result;
    }
}
