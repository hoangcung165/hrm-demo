package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.dto.accessscope.DataScope;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.ExpiryType;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.UpcomingExpiryRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

class UpcomingExpiryServiceTest {
    final UpcomingExpiryRepository repository = mock(UpcomingExpiryRepository.class);
    final AccessScopeService scopes = mock(AccessScopeService.class);
    final CurrentLegalEntity legalEntity = mock(CurrentLegalEntity.class);
    final CurrentAccount caller = new CurrentAccount(UUID.randomUUID(), Set.of("LINE_MANAGER"));
    final UUID tenant = UUID.randomUUID(), employee = UUID.randomUUID(), unit = UUID.randomUUID();
    final LocalDate today = LocalDate.of(2026, 10, 18);
    final UpcomingExpiryService service = new UpcomingExpiryService(repository, scopes, legalEntity,
            Clock.fixed(Instant.parse("2026-10-17T18:30:00Z"), ZoneOffset.UTC));

    @BeforeEach
    void setUp() {
        when(legalEntity.id()).thenReturn(tenant);
        when(scopes.scopeOf(caller)).thenReturn(scope(Set.of(Permission.EMPLOYEE_VIEW, Permission.EMPLOYEE_SENSITIVE_VIEW)));
        when(repository.list(any(), anyInt(), anyInt())).thenReturn(List.of());
    }

    @Test
    void defaultsUseCompanyDateAndPassEmployeeScopeToTheDatabase() {
        var response = service.list(caller, null, null, null, 0, 20);
        var query = ArgumentCaptor.forClass(UpcomingExpiryRepository.Query.class);
        verify(repository).list(query.capture(), eq(0), eq(20));
        assertThat(query.getValue()).isEqualTo(new UpcomingExpiryRepository.Query(tenant, false, Set.of(unit),
                employee, null, today, today, today.plusDays(365)));
        assertThat(response.asOf()).isEqualTo(today);
    }

    @Test
    void filtersAndBoundedPagesArePassedWithoutBroadeningTheScope() {
        service.list(caller, ExpiryType.VISA, today.plusDays(1), today.plusDays(10), 10000, 100);
        verify(repository).list(eq(new UpcomingExpiryRepository.Query(tenant, false, Set.of(unit), employee,
                ExpiryType.VISA, today, today.plusDays(1), today.plusDays(10))), eq(1000000), eq(100));
    }

    @Test
    void bothEmployeePermissionsAreRequiredBeforeReadingSources() {
        for (Permission missing : List.of(Permission.EMPLOYEE_VIEW, Permission.EMPLOYEE_SENSITIVE_VIEW)) {
            var permissions = EnumSet.of(Permission.EMPLOYEE_VIEW, Permission.EMPLOYEE_SENSITIVE_VIEW);
            permissions.remove(missing);
            when(scopes.scopeOf(caller)).thenReturn(scope(permissions));
            assertThatThrownBy(() -> service.list(caller, null, null, null, 0, 20))
                    .isInstanceOfSatisfying(ApiException.class,
                            e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        }
        verifyNoInteractions(repository);
    }

    @Test
    void invalidDatesAndPaginationAreRejectedBeforeQuerying() {
        for (int[] paging : new int[][] {{-1,20}, {10001,20}, {0,0}, {0,101}})
            assertThatThrownBy(() -> service.list(caller, null, null, null, paging[0], paging[1]))
                    .isInstanceOf(ApiException.class);
        for (LocalDate[] dates : new LocalDate[][] {{today.minusDays(1), today},
                {today.plusDays(1), today}, {today, today.plusDays(366)}})
            assertThatThrownBy(() -> service.list(caller, null, dates[0], dates[1], 0, 20))
                    .isInstanceOf(ApiException.class);
        verifyNoInteractions(repository);
    }

    private AccessScope scope(Set<Permission> permissions) {
        return new AccessScope(caller.id(), employee, DataScope.ORG_UNIT, Set.of(unit), permissions);
    }
}
