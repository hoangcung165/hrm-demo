package com.hrmdemo.service.resource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.project.ProjectAllocationRepository;
import com.hrmdemo.repository.project.ProjectRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.accessscope.ManagedOrgUnits;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeListService;
import com.hrmdemo.service.employee.EmployeeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** What the heatmap service refuses before it reads anything; the numbers are covered by HeatmapTableTest and the IT. */
class ResourceHeatmapServiceTest {

    static final CurrentAccount PM = new CurrentAccount(UUID.randomUUID(), Set.of("PROJECT_MANAGER"));
    static final CurrentAccount EMPLOYEE = new CurrentAccount(UUID.randomUUID(), Set.of("EMPLOYEE"));

    EmployeeListService employeeList = mock(EmployeeListService.class);
    ProjectAllocationRepository allocations = mock(ProjectAllocationRepository.class);
    ResourceHeatmapService service;

    @BeforeEach
    void setUp() {
        service = new ResourceHeatmapService(employeeList, mock(EmployeeService.class), mock(EmployeeRepository.class),
                allocations, mock(ProjectRepository.class), mock(CatalogService.class),
                mock(ResourceSettingsService.class), new AccessScopeService(mock(ManagedOrgUnits.class)),
                Clock.fixed(Instant.parse("2026-10-14T02:30:00Z"), ZoneOffset.UTC));
    }

    @Test
    void withoutTheViewPermissionNothingIsRead() {
        assertThatThrownBy(() -> service.heatmap(EMPLOYEE, query(null, null, 0, 50)))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        assertThatThrownBy(() -> service.cell(EMPLOYEE, UUID.randomUUID(), LocalDate.of(2026, 10, 12), null))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(employeeList, allocations);
    }

    @Test
    @SuppressWarnings("unchecked")
    void everyBadParameterIsReportedAtOnce() {
        ResourceHeatmapService.Query query = new ResourceHeatmapService.Query(null, "DAY", 13, "x".repeat(101), null,
                true, "HUGE", "RANDOM", -1, 201);

        assertThatThrownBy(() -> service.heatmap(PM, query)).isInstanceOfSatisfying(ApiException.class, e -> {
            assertThat(e.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(e.getCode()).isEqualTo("validation.invalid");
            List<Map<String, String>> errors = (List<Map<String, String>>) e.getProperties().get("errors");
            assertThat(errors).extracting(m -> m.get("field")).containsExactly("granularity", "sort", "level",
                    "columns", "page", "size", "q");
        });
        verifyNoInteractions(employeeList, allocations);
    }

    @Test
    @SuppressWarnings("unchecked")
    void theCellDetailNeedsAStartAndABoundedRange() {
        assertThatThrownBy(() -> service.cell(PM, UUID.randomUUID(), null, null)).isInstanceOfSatisfying(
                ApiException.class, e -> assertThat(fields(e)).containsExactly("from"));
        LocalDate from = LocalDate.of(2026, 10, 12);
        assertThatThrownBy(() -> service.cell(PM, UUID.randomUUID(), from, from.minusDays(1)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(fields(e)).containsExactly("to"));
        assertThatThrownBy(() -> service.cell(PM, UUID.randomUUID(), from, from.plusDays(101)))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(fields(e)).containsExactly("to"));
    }

    @SuppressWarnings("unchecked")
    private static List<String> fields(ApiException e) {
        return ((List<Map<String, String>>) e.getProperties().get("errors")).stream().map(m -> m.get("field"))
                .toList();
    }

    private static ResourceHeatmapService.Query query(String level, String sort, int page, int size) {
        return new ResourceHeatmapService.Query(null, null, null, null, null, true, level, sort, page, size);
    }
}
