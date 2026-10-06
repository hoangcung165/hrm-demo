package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeListItem;
import com.hrmdemo.dto.employee.EmployeeListQuery;
import com.hrmdemo.dto.employee.EmployeeOption;
import com.hrmdemo.dto.employee.EmployeeOptionsQuery;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeIdentityFields;
import com.hrmdemo.entity.employee.EmployeeJobFields;
import com.hrmdemo.entity.employee.EmployeePersonalFields;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.accessscope.RolePermissionOverrides.PermissionOverride;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

/** The employee list and picker: query parsing, permissions, and a page completed with a fixed number of reads. */
@ExtendWith(MockitoExtension.class)
class EmployeeListServiceTest {

    static final UUID DEPARTMENT = UUID.fromString("00000000-0000-0000-0000-0000000000a2");
    static final UUID TEAM = UUID.fromString("00000000-0000-0000-0000-0000000000a3");
    static final UUID POSITION = UUID.fromString("00000000-0000-0000-0000-0000000000c1");

    @Mock
    EmployeeRepository employees;
    @Mock
    OrgUnitService orgUnitService;
    @Mock
    CatalogService catalogService;

    EmployeeListService service;

    @BeforeEach
    void setUp() {
        // The Project manager role was given ORG_EDIT, as a company may do in the role matrix.
        AccessScopeService accessScopes = new AccessScopeService(employeeId -> Set.of(), () -> List.of(
                new PermissionOverride(Role.PROJECT_MANAGER, Permission.ORG_VIEW, true),
                new PermissionOverride(Role.PROJECT_MANAGER, Permission.ORG_EDIT, true)));
        service = new EmployeeListService(employees, orgUnitService, catalogService, accessScopes);
    }

    // --- query values ---

    @Test
    void theSortIsByCodeByDefaultAndTheCodeAlwaysBreaksTies() {
        assertThat(EmployeeListService.sort(null)).isEqualTo(Sort.by(Sort.Direction.ASC, "code"));
        assertThat(EmployeeListService.sort("code,desc")).isEqualTo(Sort.by(Sort.Direction.DESC, "code"));
        assertThat(EmployeeListService.sort("fullName"))
                .isEqualTo(Sort.by(Sort.Direction.ASC, "searchText").and(Sort.by("code")));
        assertThat(EmployeeListService.sort(" hireDate , DESC "))
                .isEqualTo(Sort.by(Sort.Direction.DESC, "hireDate").and(Sort.by("code")));
        for (String bad : List.of("salary", "code,up", "code,asc,x", "searchText")) {
            assertInvalid(() -> EmployeeListService.sort(bad), "sort");
        }
    }

    @Test
    void statusesAreACommaListAndEmptyMeansTheDefault() {
        Set<EmployeeStatus> none = EnumSet.noneOf(EmployeeStatus.class);
        assertThat(EmployeeListService.statuses("PROBATION, OFFICIAL", none))
                .containsExactly(EmployeeStatus.PROBATION, EmployeeStatus.OFFICIAL);
        assertThat(EmployeeListService.statuses(" , ", none)).isEmpty();
        assertThat(EmployeeListService.statuses(null, EmployeeListService.ACTIVE))
                .containsExactly(EmployeeStatus.PROBATION, EmployeeStatus.OFFICIAL);
        assertInvalid(() -> EmployeeListService.statuses("OFFICIAL,LEFT", none), "status");
        assertInvalid(() -> EmployeeListService.statuses("official", none), "status");
    }

    @Test
    void theSearchIgnoresAccentsAndCaseAndATermOfOnlySpacesSearchesNothing() {
        assertThat(EmployeeListService.search("Trần THỊ")).isEqualTo("%tran thi%");
        assertThat(EmployeeListService.search("NV0004")).isEqualTo("%nv0004%");
        assertThat(EmployeeListService.search("   ")).isNull();
        assertInvalid(() -> EmployeeListService.search("x".repeat(101)), "q");
    }

    @Test
    void pageAndSizeHaveTheirLimits() {
        assertInvalid(() -> service.list(hr(), query(-1, 20, null)), "page");
        assertInvalid(() -> service.list(hr(), query(0, 101, null)), "size");
        assertInvalid(() -> service.options(hr(), options(51)), "size");
    }

    // --- the list ---

    @Test
    void theListNeedsTheViewPermission() {
        assertForbidden(() -> service.list(account("EMPLOYEE", null), query(0, 20, null)));
        assertForbidden(() -> service.list(account("PROJECT_MANAGER", null), query(0, 20, null)));
        verifyNoInteractions(employees);
    }

    @Test
    @SuppressWarnings("unchecked")
    void aPageIsCompletedWithOneReadOfUnitsPositionsAndManagers() {
        Employee head = employee("NV00001", DEPARTMENT, EmployeeStatus.OFFICIAL);
        Employee member = employee("NV00002", TEAM, EmployeeStatus.PROBATION);
        Employee other = employee("NV00003", TEAM, EmployeeStatus.OFFICIAL);
        when(employees.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(head, member, other)));
        when(orgUnitService.summaries()).thenReturn(List.of(
                new OrgUnitSummary(DEPARTMENT, null, "ENG", "Phòng Kỹ thuật", true, head.getId()),
                new OrgUnitSummary(TEAM, DEPARTMENT, "WEB", "Nhóm Web", false, null)));
        when(catalogService.findItems(eq(Catalog.POSITION), anyCollection()))
                .thenReturn(Map.of(POSITION, new CatalogItemRef(POSITION, "SE", "Kỹ sư phần mềm", true)));
        when(employees.findAllById(anyIterable())).thenReturn(List.of(head));

        PageResponse<EmployeeListItem> page = service.list(hr(), query(0, 20, "fullName,desc"));

        assertThat(page.total()).isEqualTo(3);
        EmployeeListItem row = page.items().get(1);
        assertThat(row.code()).isEqualTo("NV00002");
        assertThat(row.orgUnit().name()).isEqualTo("Nhóm Web");
        assertThat(row.orgUnit().active()).isFalse();
        assertThat(row.orgUnit().parentName()).isEqualTo("Phòng Kỹ thuật");
        assertThat(row.position().name()).isEqualTo("Kỹ sư phần mềm");
        assertThat(row.manager().code()).isEqualTo("NV00001");
        assertThat(page.items().get(0).orgUnit().parentName()).isNull();
        assertThat(page.items().get(0).manager()).isNull();
        verify(employees, times(1)).findAllById(anyIterable());
        verify(orgUnitService, times(1)).summaries();

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(employees).findAll(any(Specification.class), pageable.capture());
        assertThat(pageable.getValue().getSort())
                .isEqualTo(Sort.by(Sort.Direction.DESC, "searchText").and(Sort.by("code")));
    }

    @Test
    @SuppressWarnings("unchecked")
    void aUnitFilterTakesTheUnitsBelowUnlessAskedNotTo() {
        when(employees.findAll(any(Specification.class), any(Pageable.class))).thenReturn(Page.empty());
        when(orgUnitService.selfAndDescendants(DEPARTMENT)).thenReturn(Set.of(DEPARTMENT, TEAM));

        service.list(hr(), new EmployeeListQuery(0, 20, null, DEPARTMENT, true, null, null, null));
        service.list(hr(), new EmployeeListQuery(0, 20, null, DEPARTMENT, false, null, null, null));

        verify(orgUnitService, times(1)).selfAndDescendants(DEPARTMENT);
    }

    // --- the picker ---

    @Test
    @SuppressWarnings("unchecked")
    void thePickerIsOpenToWhoeverPicksEmployeesElsewhere() {
        when(employees.findAll(any(Specification.class), any(Pageable.class))).thenReturn(Page.empty());

        // View: HR, Line manager. Org edit: here the Project manager. Account edit: the Admin.
        for (String role : List.of("HR", "LINE_MANAGER", "PROJECT_MANAGER", "ADMIN")) {
            assertThat(service.options(account(role, null), options(20)).total()).as(role).isZero();
        }
        assertForbidden(() -> service.options(account("EMPLOYEE", null), options(20)));
    }

    @Test
    @SuppressWarnings("unchecked")
    void aPickerRowNamesTheUnitAndThePosition() {
        Employee member = employee("NV00002", TEAM, EmployeeStatus.PROBATION);
        Employee underTheCompany = employee("NV00004", null, EmployeeStatus.OFFICIAL);
        when(employees.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(member, underTheCompany)));
        when(orgUnitService.summaries())
                .thenReturn(List.of(new OrgUnitSummary(TEAM, null, "WEB", "Nhóm Web", true, null)));
        when(catalogService.findItems(eq(Catalog.POSITION), anyCollection()))
                .thenReturn(Map.of(POSITION, new CatalogItemRef(POSITION, "SE", "Kỹ sư phần mềm", true)));

        List<EmployeeOption> rows = service.options(hr(), options(20)).items();

        assertThat(rows.get(0).orgUnitName()).isEqualTo("Nhóm Web");
        assertThat(rows.get(0).positionName()).isEqualTo("Kỹ sư phần mềm");
        assertThat(rows.get(0).status()).isEqualTo("PROBATION");
        assertThat(rows.get(1).orgUnitName()).isNull();
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(employees).findAll(any(Specification.class), pageable.capture());
        assertThat(pageable.getValue().getSort()).isEqualTo(Sort.by("searchText", "code"));
    }

    // --- helpers ---

    private static EmployeeListQuery query(int page, int size, String sort) {
        return new EmployeeListQuery(page, size, null, null, true, null, null, sort);
    }

    private static EmployeeOptionsQuery options(int size) {
        return new EmployeeOptionsQuery(0, size, null, null, true, null, null);
    }

    private static Employee employee(String code, UUID orgUnitId, EmployeeStatus status) {
        Employee employee = new Employee(code,
                new EmployeePersonalFields("Person " + code, LocalDate.of(1990, 1, 1), Gender.FEMALE, null, null, null,
                        null, null, null),
                new EmployeeIdentityFields("079190000" + code.substring(code.length() - 3), null, null, null, null),
                new EmployeeJobFields(orgUnitId, POSITION, null, LocalDate.of(2020, 1, 1), status),
                Instant.parse("2026-10-06T08:00:00Z"));
        ReflectionTestUtils.setField(employee, "id", UUID.randomUUID());
        return employee;
    }

    private static CurrentAccount hr() {
        return account("HR", null);
    }

    private static CurrentAccount account(String role, UUID employeeId) {
        return new CurrentAccount(UUID.randomUUID(), employeeId, Set.of(role));
    }

    private static void assertForbidden(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(ex.getCode()).isEqualTo("auth.forbidden");
        });
    }

    private static void assertInvalid(Runnable action, String field) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getCode()).isEqualTo("validation.invalid");
            assertThat(ex.getProperties().get("errors")).isEqualTo(List.of(Map.of("field", field, "code", "invalid")));
        });
    }
}
