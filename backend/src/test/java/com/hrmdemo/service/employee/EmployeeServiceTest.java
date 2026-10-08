package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeCreateRequest;
import com.hrmdemo.dto.employee.EmployeeIdentityRequest;
import com.hrmdemo.dto.employee.EmployeeJobRequest;
import com.hrmdemo.dto.employee.EmployeePersonalRequest;
import com.hrmdemo.dto.employee.EmployeePersonalUpdateRequest;
import com.hrmdemo.dto.employee.EmployeeResponse;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeCodeCounter;
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
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

/** Employees: masking, the default Quản lý trực tiếp, data scope, the create checks and the edit rules. */
@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

    static final Instant NOW = Instant.parse("2026-10-06T08:00:00Z");
    static final String CCCD = "079194005678";

    /** The tree: BRANCH (head: DIRECTOR) > DEPARTMENT (head: MANAGER) > TEAM (no head). */
    static final UUID BRANCH = UUID.fromString("00000000-0000-0000-0000-0000000000a1");
    static final UUID DEPARTMENT = UUID.fromString("00000000-0000-0000-0000-0000000000a2");
    static final UUID TEAM = UUID.fromString("00000000-0000-0000-0000-0000000000a3");
    static final UUID OTHER_UNIT = UUID.fromString("00000000-0000-0000-0000-0000000000a4");
    static final UUID POSITION = UUID.fromString("00000000-0000-0000-0000-0000000000c1");

    @Mock
    EmployeeRepository employees;
    @Mock
    EmployeeCodes codes;
    @Mock
    OrgUnitService orgUnitService;
    @Mock
    CatalogService catalogService;

    EmployeeService service;
    Employee director;
    Employee manager;

    @BeforeEach
    void setUp() {
        // A Line manager heads DEPARTMENT, and so sees DEPARTMENT and TEAM.
        AccessScopeService accessScopes = new AccessScopeService(
                employeeId -> employeeId.equals(manager.getId()) ? Set.of(DEPARTMENT, TEAM) : Set.of());
        service = new EmployeeService(employees, codes, orgUnitService, catalogService, accessScopes,
                Clock.fixed(NOW, ZoneOffset.UTC));
        director = stored("NV00001", "Nguyễn Văn An", BRANCH, null, EmployeeStatus.OFFICIAL);
        manager = stored("NV00002", "Lê Minh Quân", DEPARTMENT, null, EmployeeStatus.OFFICIAL);
        OrgUnitSummary branch = new OrgUnitSummary(BRANCH, null, "HN", "Chi nhánh Hà Nội", true, director.getId());
        OrgUnitSummary department = new OrgUnitSummary(DEPARTMENT, BRANCH, "ENG", "Phòng Kỹ thuật", true,
                manager.getId());
        OrgUnitSummary team = new OrgUnitSummary(TEAM, DEPARTMENT, "WEB", "Nhóm Web", true, null);
        lenient().when(orgUnitService.selfAndAncestors(TEAM)).thenReturn(List.of(team, department, branch));
        lenient().when(orgUnitService.selfAndAncestors(DEPARTMENT)).thenReturn(List.of(department, branch));
        lenient().when(orgUnitService.selfAndAncestors(BRANCH)).thenReturn(List.of(branch));
        lenient().when(orgUnitService.find(TEAM)).thenReturn(Optional.of(team));
        lenient().when(orgUnitService.find(DEPARTMENT)).thenReturn(Optional.of(department));
        lenient().when(catalogService.findItem(Catalog.POSITION, POSITION))
                .thenReturn(Optional.of(new CatalogItemRef(POSITION, "SE", "Kỹ sư phần mềm", true)));
    }

    // --- the default Quản lý trực tiếp ---

    @Test
    void aMemberFollowsTheHeadOfTheNearestUnitWithAHead() {
        assertThat(service.unitHead(TEAM, null)).containsSame(manager);
        assertThat(service.unitHead(DEPARTMENT, null)).containsSame(manager);
    }

    @Test
    void theHeadOfAUnitFollowsTheHeadOfTheUnitAbove() {
        assertThat(service.unitHead(DEPARTMENT, manager.getId())).containsSame(director);
        assertThat(service.unitHead(BRANCH, director.getId())).isEmpty();
    }

    @Test
    void anInactiveHeadIsSkippedAndNoUnitMeansNoDefault() {
        ReflectionTestUtils.setField(manager, "status", EmployeeStatus.INACTIVE);

        assertThat(service.unitHead(TEAM, null)).containsSame(director);
        assertThat(service.unitHead(null, null)).isEmpty();
    }

    @Test
    void theProfileSaysWhetherTheManagerWasChosenOrFollowsTheUnitHead() {
        Employee member = stored("NV00010", "Trần Thị Mai", TEAM, null, EmployeeStatus.PROBATION);
        Employee assigned = stored("NV00011", "Phạm Thu Hà", TEAM, director.getId(), EmployeeStatus.OFFICIAL);

        EmployeeResponse following = service.get(hr(), member.getId());
        assertThat(following.job().managerSource()).isEqualTo("UNIT_HEAD");
        assertThat(following.job().manager().code()).isEqualTo("NV00002");
        assertThat(following.job().orgUnit().code()).isEqualTo("WEB");
        assertThat(following.job().position().name()).isEqualTo("Kỹ sư phần mềm");

        EmployeeResponse chosen = service.get(hr(), assigned.getId());
        assertThat(chosen.job().managerSource()).isEqualTo("ASSIGNED");
        assertThat(chosen.job().manager().code()).isEqualTo("NV00001");
    }

    // --- masking ---

    @Test
    void numbersAreMaskedButForTheLastFourDigits() {
        assertThat(SensitiveNumbers.mask("079194005678")).isEqualTo("••••••••5678");
        assertThat(SensitiveNumbers.mask("7912341234")).isEqualTo("••••••1234");
        assertThat(SensitiveNumbers.mask("123")).isEqualTo("123");
        assertThat(SensitiveNumbers.mask(null)).isNull();
    }

    @Test
    void withoutTheSensitivePermissionTheNumbersComeBackMasked() {
        Employee member = stored("NV00010", "Trần Thị Mai", TEAM, null, EmployeeStatus.PROBATION);

        EmployeeResponse forDirector = service.get(account("DIRECTOR", null), member.getId());
        assertThat(forDirector.identity().masked()).isTrue();
        assertThat(forDirector.identity().idNumber()).isEqualTo("••••••••5678");
        assertThat(forDirector.identity().taxCode()).isEqualTo("••••••••5678");
        assertThat(forDirector.identity().socialInsuranceNumber()).isNull();

        EmployeeResponse accountant = service.get(account("ACCOUNTANT", null), member.getId());
        assertThat(accountant.identity().masked()).isFalse();
        assertThat(accountant.identity().idNumber()).isEqualTo(CCCD);
    }

    @Test
    void anEmployeeReadsTheirOwnProfileUnmaskedWithoutAnyPermission() {
        Employee member = stored("NV00010", "Trần Thị Mai", TEAM, null, EmployeeStatus.PROBATION);

        EmployeeResponse own = service.get(account("EMPLOYEE", member.getId()), member.getId());

        assertThat(own.identity().masked()).isFalse();
        assertThat(own.identity().idNumber()).isEqualTo(CCCD);
        assertForbidden(() -> service.get(account("EMPLOYEE", member.getId()), manager.getId()));
    }

    // --- data scope ---

    @Test
    void aLineManagerReadsTheProfilesOfTheirUnitsOnly() {
        Employee member = stored("NV00010", "Trần Thị Mai", TEAM, null, EmployeeStatus.PROBATION);
        Employee elsewhere = stored("NV00012", "Đỗ Văn Bình", OTHER_UNIT, null, EmployeeStatus.OFFICIAL);
        Employee underTheCompany = stored("NV00013", "Hoàng Thị Lan", null, null, EmployeeStatus.OFFICIAL);
        CurrentAccount lineManager = account("LINE_MANAGER", manager.getId());

        assertThat(service.get(lineManager, member.getId()).identity().masked()).isTrue();
        assertForbidden(() -> service.get(lineManager, elsewhere.getId()));
        assertForbidden(() -> service.get(lineManager, underTheCompany.getId()));
        assertThat(service.get(hr(), underTheCompany.getId()).job().orgUnit()).isNull();
    }

    @Test
    void anUnknownEmployeeIsNotFoundForACallerWhoMayRead() {
        assertThatThrownBy(() -> service.get(hr(), UUID.randomUUID()))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(ex.getCode()).isEqualTo("employee.not_found");
                });
        assertForbidden(() -> service.get(account("EMPLOYEE", null), UUID.randomUUID()));
    }

    // --- create ---

    @Test
    void createChecksPermissionAndFieldsBeforeAnythingIsRead() {
        assertForbidden(() -> service.create(account("DIRECTOR", null), request(TEAM, null)));
        assertThatThrownBy(() -> service.create(hr(), new EmployeeCreateRequest(null, null, null, null)))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("validation.invalid"));
        verifyNoInteractions(employees, codes, orgUnitService, catalogService);
    }

    @Test
    void theNumbersAreCheckedUnderTheCodeLockAndTheCodeIsIssuedLast() {
        EmployeeCodeCounter counter = new EmployeeCodeCounter(UUID.randomUUID(), 41);
        when(codes.lock()).thenReturn(counter);
        when(codes.issue(counter)).thenReturn("NV00042");
        when(employees.save(any(Employee.class))).thenAnswer(call -> {
            Employee saved = call.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", UUID.randomUUID());
            return saved;
        });

        EmployeeResponse created = service.create(hr(), request(TEAM, null));

        assertThat(created.code()).isEqualTo("NV00042");
        assertThat(created.status()).isEqualTo("PROBATION");
        assertThat(created.job().managerSource()).isEqualTo("UNIT_HEAD");
        assertThat(created.identity().masked()).isFalse();
        InOrder order = inOrder(codes, employees);
        order.verify(codes).lock();
        order.verify(employees).findFirstByIdNumber(CCCD);
        order.verify(codes).issue(counter);
        order.verify(employees).save(any(Employee.class));
    }

    @Test
    void aTakenCccdIsAConflictThatNamesTheHolderOnlyWithinTheScope() {
        Employee holder = stored("NV00010", "Trần Thị Mai", TEAM, null, EmployeeStatus.PROBATION);
        when(employees.findFirstByIdNumber(CCCD)).thenReturn(Optional.of(holder));

        assertThatThrownBy(() -> service.create(hr(), request(TEAM, null)))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(ex.getCode()).isEqualTo("employee.id_number_taken");
                    assertThat(ex.getProperties()).containsKey("employee");
                });
        verify(codes, never()).issue(any());
        verify(employees, never()).save(any());
    }

    @Test
    void newReferencesMustExistAndBeActive() {
        when(orgUnitService.find(OTHER_UNIT)).thenReturn(Optional.empty());
        assertCode(() -> service.create(hr(), request(OTHER_UNIT, null)), HttpStatus.BAD_REQUEST,
                "employee.org_unit_not_found");

        when(orgUnitService.find(OTHER_UNIT))
                .thenReturn(Optional.of(new OrgUnitSummary(OTHER_UNIT, null, "OLD", "Old", false, null)));
        assertCode(() -> service.create(hr(), request(OTHER_UNIT, null)), HttpStatus.CONFLICT,
                "employee.org_unit_inactive");

        when(catalogService.findItem(Catalog.POSITION, POSITION))
                .thenReturn(Optional.of(new CatalogItemRef(POSITION, "SE", "Kỹ sư phần mềm", false)));
        assertCode(() -> service.create(hr(), request(TEAM, null)), HttpStatus.CONFLICT,
                "employee.position_inactive");

        when(catalogService.findItem(Catalog.POSITION, POSITION)).thenReturn(Optional.empty());
        assertCode(() -> service.create(hr(), request(TEAM, null)), HttpStatus.BAD_REQUEST,
                "employee.position_not_found");
        verifyNoInteractions(codes);
    }

    @Test
    void theManagerMustBeAnActiveEmployee() {
        ReflectionTestUtils.setField(director, "status", EmployeeStatus.INACTIVE);

        assertCode(() -> service.create(hr(), request(TEAM, director.getId())), HttpStatus.BAD_REQUEST,
                "employee.manager_not_found");
        assertCode(() -> service.create(hr(), request(TEAM, UUID.randomUUID())), HttpStatus.BAD_REQUEST,
                "employee.manager_not_found");
    }

    // --- edit: status ---

    @Test
    void theStatusSwitchesBetweenProbationAndOfficialOnly() {
        EmployeeService.requireStatusChange(EmployeeStatus.PROBATION, EmployeeStatus.OFFICIAL);
        EmployeeService.requireStatusChange(EmployeeStatus.OFFICIAL, EmployeeStatus.PROBATION);
        EmployeeService.requireStatusChange(EmployeeStatus.OFFICIAL, EmployeeStatus.OFFICIAL);
        assertCode(() -> EmployeeService.requireStatusChange(EmployeeStatus.OFFICIAL, EmployeeStatus.INACTIVE),
                HttpStatus.CONFLICT, "employee.status_change_not_allowed");
        assertCode(() -> EmployeeService.requireStatusChange(EmployeeStatus.INACTIVE, EmployeeStatus.INACTIVE),
                HttpStatus.CONFLICT, "employee.status_change_not_allowed");
        assertCode(() -> EmployeeService.requireStatusChange(EmployeeStatus.INACTIVE, EmployeeStatus.OFFICIAL),
                HttpStatus.CONFLICT, "employee.status_change_not_allowed");
    }

    @Test
    void anEmployeeWhoLeftCannotBeEditedThroughTheJobPart() {
        Employee left = stored("NV00010", "Trần Thị Mai", TEAM, null, EmployeeStatus.INACTIVE);

        assertCode(() -> service.editJob(hr(), left.getId(), job(TEAM, null, "PROBATION")), HttpStatus.CONFLICT,
                "employee.status_change_not_allowed");
        assertThat(left.getStatus()).isEqualTo(EmployeeStatus.INACTIVE);
    }

    @Test
    void theJobPartSwitchesTheStatusAndKeepsTheCode() {
        Employee member = stored("NV00010", "Trần Thị Mai", TEAM, null, EmployeeStatus.PROBATION);

        EmployeeResponse edited = service.editJob(hr(), member.getId(), job(TEAM, null, "OFFICIAL"));

        assertThat(edited.status()).isEqualTo("OFFICIAL");
        assertThat(edited.code()).isEqualTo("NV00010");
        assertThat(member.getUpdatedAt()).isEqualTo(NOW);
    }

    // --- edit: the manager ---

    @Test
    void theManagerIsNeitherTheEmployeeItselfNorSomeoneWhoseChainLeadsBack() {
        Employee member = stored("NV00010", "Trần Thị Mai", TEAM, null, EmployeeStatus.OFFICIAL);
        Employee report = stored("NV00011", "Phạm Thu Hà", OTHER_UNIT, member.getId(), EmployeeStatus.OFFICIAL);

        assertManagerInvalid(() -> service.editJob(hr(), member.getId(), job(TEAM, member.getId(), "OFFICIAL")),
                "SELF");
        // The report's chosen manager is the member: member -> report -> member.
        assertManagerInvalid(() -> service.editJob(hr(), member.getId(), job(TEAM, report.getId(), "OFFICIAL")),
                "CYCLE");
        // The director follows the default and heads BRANCH; the manager heads DEPARTMENT under it.
        // director -> manager -> (unit head of DEPARTMENT, skipping itself) director.
        assertManagerInvalid(() -> service.editJob(hr(), director.getId(), job(BRANCH, manager.getId(), "OFFICIAL")),
                "CYCLE");
        assertThat(member.getManagerId()).isNull();
    }

    @Test
    void aChainThatEndsOrLoopsElsewhereIsAccepted() {
        Employee member = stored("NV00010", "Trần Thị Mai", TEAM, null, EmployeeStatus.OFFICIAL);
        // a and b already point at each other; the walk stops at the repeat.
        Employee a = stored("NV00020", "Đỗ Văn Bình", OTHER_UNIT, null, EmployeeStatus.OFFICIAL);
        Employee b = stored("NV00021", "Hoàng Thị Lan", OTHER_UNIT, a.getId(), EmployeeStatus.OFFICIAL);
        ReflectionTestUtils.setField(a, "managerId", b.getId());

        service.requireNoCycle(member.getId(), a.getId());
        service.requireNoCycle(member.getId(), manager.getId());

        EmployeeResponse edited = service.editJob(hr(), member.getId(), job(TEAM, director.getId(), "OFFICIAL"));
        assertThat(edited.job().managerSource()).isEqualTo("ASSIGNED");
        assertThat(edited.job().manager().code()).isEqualTo("NV00001");
    }

    @Test
    void followingTheUnitHeadIntoAnotherUnitMustNotCloseALoop() {
        Employee mover = stored("NV00010", "Trần Thị Mai", OTHER_UNIT, null, EmployeeStatus.OFFICIAL);
        // The head of DEPARTMENT reports to the mover by choice; in TEAM the mover would follow that head.
        ReflectionTestUtils.setField(manager, "managerId", mover.getId());

        assertManagerInvalid(() -> service.editJob(hr(), mover.getId(), job(TEAM, null, "OFFICIAL")), "CYCLE");
        assertThat(mover.getOrgUnitId()).isEqualTo(OTHER_UNIT);
    }

    @Test
    void goingBackToTheUnitHeadMustNotCloseALoopEither() {
        Employee member = stored("NV00010", "Trần Thị Mai", TEAM, director.getId(), EmployeeStatus.OFFICIAL);
        ReflectionTestUtils.setField(manager, "managerId", member.getId());

        assertManagerInvalid(() -> service.editJob(hr(), member.getId(), job(TEAM, null, "OFFICIAL")), "CYCLE");
        assertThat(member.getManagerId()).isEqualTo(director.getId());
    }

    @Test
    void theProfileNamesTheUnitAboveTheEmployeesUnit() {
        Employee member = stored("NV00010", "Trần Thị Mai", TEAM, null, EmployeeStatus.OFFICIAL);
        Employee head = stored("NV00012", "Lê Văn Hùng", BRANCH, null, EmployeeStatus.OFFICIAL);
        lenient().when(orgUnitService.find(BRANCH)).thenReturn(Optional.of(
                new OrgUnitSummary(BRANCH, null, "HN", "Chi nhánh Hà Nội", true, director.getId())));

        assertThat(service.get(hr(), member.getId()).job().orgUnit().parentName()).isEqualTo("Phòng Kỹ thuật");
        assertThat(service.get(hr(), head.getId()).job().orgUnit().parentName()).as("directly under the company")
                .isNull();
    }

    // --- system use (startup seeders) ---

    @Test
    void theSystemAddsAnEmployeeWithTheNextCodeAndNoCaller() {
        EmployeeCodeCounter counter = org.mockito.Mockito.mock(EmployeeCodeCounter.class);
        when(codes.lock()).thenReturn(counter);
        when(codes.issue(counter)).thenReturn("NV00042");
        when(employees.save(any(Employee.class))).thenAnswer(call -> {
            Employee saved = call.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", UUID.randomUUID());
            return saved;
        });

        UUID id = service.createAsSystem(request(TEAM, null));

        assertThat(id).isNotNull();
        InOrder order = inOrder(codes, employees);
        order.verify(codes).lock();
        order.verify(employees).findFirstByIdNumber(CCCD);
        order.verify(codes).issue(counter);
        order.verify(employees).save(any(Employee.class));
    }

    @Test
    void theSystemIsHeldToTheSameFieldAndReferenceRules() {
        assertCode(() -> service.createAsSystem(request(OTHER_UNIT, null)), HttpStatus.BAD_REQUEST,
                "employee.org_unit_not_found");
        when(employees.findFirstByIdNumber(CCCD)).thenReturn(Optional.of(director));
        when(codes.lock()).thenReturn(org.mockito.Mockito.mock(EmployeeCodeCounter.class));
        assertCode(() -> service.createAsSystem(request(TEAM, null)), HttpStatus.CONFLICT, "employee.id_number_taken");
        verify(employees, never()).save(any());
    }

    // --- edit: unchanged references ---

    @Test
    void unchangedReferencesAreNotCheckedAgainButChangedOnesMustBeActive() {
        Employee member = stored("NV00010", "Trần Thị Mai", OTHER_UNIT, director.getId(), EmployeeStatus.OFFICIAL);
        when(orgUnitService.find(OTHER_UNIT))
                .thenReturn(Optional.of(new OrgUnitSummary(OTHER_UNIT, null, "OLD", "Old", false, null)));
        when(catalogService.findItem(Catalog.POSITION, POSITION))
                .thenReturn(Optional.of(new CatalogItemRef(POSITION, "SE", "Kỹ sư phần mềm", false)));
        ReflectionTestUtils.setField(director, "status", EmployeeStatus.INACTIVE);

        // Same unit, position and manager, all inactive by now: the edit goes through.
        EmployeeResponse edited = service.editJob(hr(), member.getId(), job(OTHER_UNIT, director.getId(), "OFFICIAL"));
        assertThat(edited.job().orgUnit().active()).isFalse();
        assertThat(edited.job().position().active()).isFalse();

        Employee moving = stored("NV00011", "Phạm Thu Hà", TEAM, null, EmployeeStatus.OFFICIAL);
        assertCode(() -> service.editJob(hr(), moving.getId(), job(OTHER_UNIT, null, "OFFICIAL")),
                HttpStatus.CONFLICT, "employee.org_unit_inactive");
        assertCode(() -> service.editJob(hr(), moving.getId(), job(TEAM, director.getId(), "OFFICIAL")),
                HttpStatus.BAD_REQUEST, "employee.manager_not_found");
        ReflectionTestUtils.setField(moving, "positionId", UUID.randomUUID());
        assertCode(() -> service.editJob(hr(), moving.getId(), job(TEAM, null, "OFFICIAL")),
                HttpStatus.CONFLICT, "employee.position_inactive");
    }

    // --- edit: permissions, scope, identity ---

    @Test
    void editingNeedsTheEditPermissionWithinTheScopeAndTheNumbersAlsoTheSensitiveOne() {
        Employee member = stored("NV00010", "Trần Thị Mai", TEAM, null, EmployeeStatus.OFFICIAL);
        Employee elsewhere = stored("NV00012", "Đỗ Văn Bình", OTHER_UNIT, null, EmployeeStatus.OFFICIAL);

        assertForbidden(() -> service.editPersonal(account("ACCOUNTANT", null), member.getId(), personal()));
        assertForbidden(() -> service.editIdentity(account("ACCOUNTANT", null), member.getId(), identity(CCCD)));
        assertCode(() -> service.editJob(hr(), UUID.randomUUID(), job(TEAM, null, "OFFICIAL")),
                HttpStatus.NOT_FOUND, "employee.not_found");

        // A Line manager granted EMPLOYEE_EDIT: only within the units it heads, and only into them.
        CurrentAccount lineManager = new CurrentAccount(UUID.randomUUID(), manager.getId(), Set.of("LINE_MANAGER"));
        AccessScopeService granted = new AccessScopeService(
                employeeId -> employeeId.equals(manager.getId()) ? Set.of(DEPARTMENT, TEAM) : Set.of(),
                () -> List.of(new PermissionOverride(Role.LINE_MANAGER, Permission.EMPLOYEE_EDIT, true)));
        EmployeeService withEdit = new EmployeeService(employees, codes, orgUnitService, catalogService, granted,
                Clock.fixed(NOW, ZoneOffset.UTC));
        assertThat(withEdit.editPersonal(lineManager, member.getId(), personal()).fullName())
                .isEqualTo("Trần Thị Mai Anh");
        assertForbidden(() -> withEdit.editPersonal(lineManager, elsewhere.getId(), personal()));
        when(orgUnitService.find(OTHER_UNIT))
                .thenReturn(Optional.of(new OrgUnitSummary(OTHER_UNIT, null, "OTH", "Other", true, null)));
        assertForbidden(() -> withEdit.editJob(lineManager, member.getId(), job(OTHER_UNIT, null, "OFFICIAL")));
        assertForbidden(() -> withEdit.editJob(lineManager, member.getId(), job(null, null, "OFFICIAL")));
    }

    @Test
    void theNumbersAreCheckedUnderTheCreateLockAndTheEmployeesOwnDoNotCount() {
        Employee member = stored("NV00010", "Trần Thị Mai", TEAM, null, EmployeeStatus.OFFICIAL);
        Employee other = stored("NV00011", "Phạm Thu Hà", TEAM, null, EmployeeStatus.OFFICIAL);
        when(employees.findFirstByIdNumber(CCCD)).thenReturn(Optional.of(member));

        EmployeeResponse edited = service.editIdentity(hr(), member.getId(),
                new EmployeeIdentityRequest(CCCD, null, null, "0312345678", null));
        assertThat(edited.identity().taxCode()).isEqualTo("0312345678");
        assertThat(edited.identity().masked()).isFalse();
        InOrder order = inOrder(codes, employees);
        order.verify(codes).lock();
        order.verify(employees).findFirstByIdNumber(CCCD);

        when(employees.findFirstByTaxCode("0312345678")).thenReturn(Optional.of(member));
        assertCode(() -> service.editIdentity(hr(), other.getId(),
                new EmployeeIdentityRequest("079194000002", null, null, "0312345678", null)),
                HttpStatus.CONFLICT, "employee.tax_code_taken");
        assertThat(other.getTaxCode()).isEqualTo(CCCD);
    }

    // --- helpers ---

    private Employee stored(String code, String fullName, UUID orgUnitId, UUID managerId, EmployeeStatus status) {
        Employee employee = new Employee(code,
                new EmployeePersonalFields(fullName, LocalDate.of(1994, 3, 12), Gender.FEMALE, null, null, null, null,
                        null, null),
                new EmployeeIdentityFields(CCCD, null, null, CCCD, null),
                new EmployeeJobFields(orgUnitId, POSITION, managerId, LocalDate.of(2023, 7, 1), status), NOW);
        ReflectionTestUtils.setField(employee, "id", UUID.randomUUID());
        lenient().when(employees.findById(employee.getId())).thenReturn(Optional.of(employee));
        return employee;
    }

    private static EmployeeCreateRequest request(UUID orgUnitId, UUID managerId) {
        return new EmployeeCreateRequest("Trần Thị Mai",
                new EmployeePersonalRequest(LocalDate.of(1994, 3, 12), "FEMALE", null, null, null, null),
                new EmployeeIdentityRequest(CCCD, null, null, null, null),
                new EmployeeJobRequest(orgUnitId, POSITION, managerId, LocalDate.of(2026, 11, 1), null));
    }

    private static CurrentAccount hr() {
        return account("HR", null);
    }

    private static CurrentAccount account(String role, UUID employeeId) {
        return new CurrentAccount(UUID.randomUUID(), employeeId, Set.of(role));
    }

    private static void assertForbidden(Runnable action) {
        assertCode(action, HttpStatus.FORBIDDEN, "auth.forbidden");
    }

    private static void assertCode(Runnable action, HttpStatus status, String code) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getStatus()).isEqualTo(status);
            assertThat(ex.getCode()).isEqualTo(code);
        });
    }

    private static EmployeeJobRequest job(UUID orgUnitId, UUID managerId, String status) {
        return new EmployeeJobRequest(orgUnitId, POSITION, managerId, LocalDate.of(2023, 7, 1), status);
    }

    private static EmployeePersonalUpdateRequest personal() {
        return new EmployeePersonalUpdateRequest("Trần Thị Mai Anh",
                new EmployeePersonalRequest(LocalDate.of(1994, 3, 12), "FEMALE", null, null, null, null));
    }

    private static EmployeeIdentityRequest identity(String idNumber) {
        return new EmployeeIdentityRequest(idNumber, null, null, null, null);
    }

    private static void assertManagerInvalid(Runnable action, String reason) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(ex.getCode()).isEqualTo("employee.manager_invalid");
            assertThat(ex.getProperties()).containsEntry("reason", reason);
        });
    }
}
