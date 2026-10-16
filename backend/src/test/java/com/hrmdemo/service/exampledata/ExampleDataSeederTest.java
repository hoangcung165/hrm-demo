package com.hrmdemo.service.exampledata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeCreateRequest;
import com.hrmdemo.dto.orgunit.OrgUnitCreateRequest;
import com.hrmdemo.dto.orgunit.OrgUnitResponse;
import com.hrmdemo.entity.auth.DemoPersona;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.service.auth.AccountAdminService;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeFieldRulesAccess;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.exampledata.ExampleDataSeeder.ExampleUnit;
import com.hrmdemo.service.exampledata.ExampleEmployees.ExampleEmployee;
import com.hrmdemo.service.legalentity.LegalEntityService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;

/** What the seeder asks of the org and company services, and that its data would pass the API's own checks. */
@ExtendWith(MockitoExtension.class)
class ExampleDataSeederTest {

    @Mock
    OrgUnitService orgUnitService;
    @Mock
    LegalEntityService legalEntityService;
    @Mock
    EmployeeService employeeService;
    @Mock
    CatalogService catalogService;
    @Mock
    AccountAdminService accountAdminService;
    @Mock
    ExampleApprovals exampleApprovals;
    @Mock
    ExampleProjects exampleProjects;
    @Mock
    ExampleAuditRecords exampleAuditRecords;

    /** Units the mocked service was asked to create, in order, and the id it gave each code. */
    final List<OrgUnitCreateRequest> created = new ArrayList<>();
    final Map<String, UUID> idByCode = new HashMap<>();
    /** Employees the mocked service was asked to add, in order, and the id it gave each name. */
    final List<EmployeeCreateRequest> employees = new ArrayList<>();
    final Map<String, UUID> employeeIdByName = new HashMap<>();
    final Map<String, UUID> positionIdByCode = new HashMap<>();

    ExampleDataSeeder seeder;

    @BeforeEach
    void setUp() {
        seeder = new ExampleDataSeeder(orgUnitService, legalEntityService, employeeService, catalogService,
                accountAdminService, exampleApprovals, exampleProjects, exampleAuditRecords);
        lenient().when(catalogService.findItemByCode(eq(Catalog.POSITION), anyString())).thenAnswer(call ->
                Optional.of(new CatalogItemRef(positionId(call.getArgument(1)), call.getArgument(1), "Position", true)));
        lenient().when(employeeService.createAsSystem(any())).thenAnswer(call -> {
            EmployeeCreateRequest request = call.getArgument(0);
            UUID id = UUID.randomUUID();
            employees.add(request);
            employeeIdByName.put(request.fullName(), id);
            return id;
        });
        lenient().when(orgUnitService.createAsSystem(any())).thenAnswer(call -> {
            OrgUnitCreateRequest request = call.getArgument(0);
            UUID id = UUID.randomUUID();
            created.add(request);
            idByCode.put(request.code(), id);
            return new OrgUnitResponse(id, request.code(), request.name(), request.type(), request.parentId(), true,
                    null, 0, 0, 0, 0);
        });
    }

    @Test
    void anEmptyOrgTreeGetsEveryUnitUnderItsParentInListedOrder() {
        when(orgUnitService.hasUnits()).thenReturn(false);
        when(legalEntityService.fillDefaultCompanyInfo(ExampleDataSeeder.COMPANY)).thenReturn(true);

        run();

        assertThat(created).extracting(OrgUnitCreateRequest::code).containsExactly(
                "PTPM", "WEB", "MOBILE", "DEVOPS", "DATA", "QA", "GAME", "DVKH", "TK", "HTKH", "KD", "KDGP", "MKT",
                "HCNS", "TCKT", "CNDN", "PMDN", "WEBDN", "MOBDN", "KTDN");
        for (int i = 0; i < created.size(); i++) {
            ExampleUnit unit = ExampleDataSeeder.UNITS.get(i);
            OrgUnitCreateRequest request = created.get(i);
            assertThat(request.name()).isEqualTo(unit.name());
            assertThat(request.type()).isEqualTo(unit.type().name());
            assertThat(request.parentId()).as("parent of %s", unit.code())
                    .isEqualTo(unit.parentCode() == null ? null : idByCode.get(unit.parentCode()));
            assertThat(request.headEmployeeId()).isNull();
        }
        verify(legalEntityService).fillDefaultCompanyInfo(ExampleDataSeeder.COMPANY);
    }

    @Test
    void onlyTheGameTeamIsDeactivatedAfterItWasCreated() {
        when(orgUnitService.hasUnits()).thenReturn(false);

        run();

        InOrder order = inOrder(orgUnitService, employeeService);
        order.verify(orgUnitService).createAsSystem(ExampleDataSeeder.UNITS.getLast().toRequest(idByCode.get("CNDN")));
        order.verify(orgUnitService).deactivateAsSystem(idByCode.get("GAME"));
        order.verify(employeeService, org.mockito.Mockito.atLeastOnce()).createAsSystem(any());
        verify(orgUnitService).deactivateAsSystem(any());
    }

    @Test
    void theEmployeesAreAddedInListedOrderWithTheirUnitsAndPositionsAndHeadTheirUnits() {
        when(orgUnitService.hasUnits()).thenReturn(false);

        run();

        assertThat(employees).hasSize(ExampleEmployees.EMPLOYEES.size());
        assertThat(employees.getFirst().fullName()).as("the Giám đốc gets NV00001").isEqualTo("Phạm Quốc Bảo");
        assertThat(employees.getFirst().job().orgUnitId()).isNull();
        for (int i = 0; i < employees.size(); i++) {
            ExampleEmployee example = ExampleEmployees.EMPLOYEES.get(i);
            EmployeeCreateRequest request = employees.get(i);
            assertThat(request.fullName()).isEqualTo(example.fullName());
            assertThat(request.job().orgUnitId()).as(example.fullName())
                    .isEqualTo(example.unitCode() == null ? null : idByCode.get(example.unitCode()));
            assertThat(request.job().positionId()).isEqualTo(positionIdByCode.get(example.positionCode()));
            assertThat(request.job().managerId()).as("everyone follows the unit head").isNull();
        }
        // One head for every active unit, none for the inactive Nhóm Game.
        for (ExampleUnit unit : ExampleDataSeeder.UNITS) {
            if (unit.active()) {
                verify(orgUnitService).assignHeadAsSystem(eq(idByCode.get(unit.code())), any());
            } else {
                verify(orgUnitService, never()).assignHeadAsSystem(eq(idByCode.get(unit.code())), any());
            }
        }
        verify(orgUnitService).assignHeadAsSystem(idByCode.get("WEB"), employeeIdByName.get("Lê Văn Hùng"));
    }

    @Test
    void everyPersonaButTheAdminIsLinkedToItsEmployee() {
        when(orgUnitService.hasUnits()).thenReturn(false);

        run();

        verify(accountAdminService).linkDemoPersonaAsSystem(DemoPersona.DIRECTOR, employeeIdByName.get("Phạm Quốc Bảo"));
        verify(accountAdminService).linkDemoPersonaAsSystem(DemoPersona.HR, employeeIdByName.get("Trần Thị Mai"));
        verify(accountAdminService).linkDemoPersonaAsSystem(DemoPersona.ACCOUNTANT,
                employeeIdByName.get("Hoàng Thị Thu"));
        verify(accountAdminService).linkDemoPersonaAsSystem(DemoPersona.LINE_MANAGER,
                employeeIdByName.get("Lê Văn Hùng"));
        verify(accountAdminService).linkDemoPersonaAsSystem(DemoPersona.PROJECT_MANAGER,
                employeeIdByName.get("Vũ Thị Lan"));
        verify(accountAdminService).linkDemoPersonaAsSystem(DemoPersona.EMPLOYEE,
                employeeIdByName.get("Nguyễn Văn An"));
        verify(accountAdminService, never()).linkDemoPersonaAsSystem(eq(DemoPersona.ADMIN), any());
        // The persona names are the Employees' names.
        for (ExampleEmployee example : ExampleEmployees.EMPLOYEES) {
            if (example.persona() != null) {
                assertThat(example.persona().fullName()).isEqualTo(example.fullName());
            }
        }
    }

    @Test
    void anEmployeeWhosePositionIsGoneIsLeftOutWithItsHeadRole() {
        when(orgUnitService.hasUnits()).thenReturn(false);
        when(catalogService.findItemByCode(Catalog.POSITION, "TN")).thenReturn(Optional.empty());

        run();

        assertThat(employees).extracting(EmployeeCreateRequest::fullName)
                .contains("Phạm Quốc Bảo", "Trần Thị Mai").doesNotContain("Lê Văn Hùng");
        verify(orgUnitService, never()).assignHeadAsSystem(eq(idByCode.get("WEB")), any());
    }

    @Test
    void noEmployeeIsAddedWhenTheCompanyAlreadyHasOne() {
        when(orgUnitService.hasUnits()).thenReturn(false);
        when(employeeService.hasEmployees()).thenReturn(true);

        run();

        verify(employeeService, never()).createAsSystem(any());
        verify(orgUnitService, never()).assignHeadAsSystem(any(), any());
    }

    @Test
    void theExampleEmployeesPassTheFieldRulesAndHaveUniqueWellFormedNumbers() {
        LocalDate today = LocalDate.of(2026, 10, 8);
        Set<String> idNumbers = new HashSet<>();
        Set<String> socialInsuranceNumbers = new HashSet<>();
        for (int i = 0; i < ExampleEmployees.EMPLOYEES.size(); i++) {
            ExampleEmployee example = ExampleEmployees.EMPLOYEES.get(i);
            EmployeeCreateRequest request = ExampleEmployees.toRequest(i, example, UUID.randomUUID(),
                    UUID.randomUUID());
            assertThat(EmployeeFieldRulesAccess.passes(request, today)).as(example.fullName()).isTrue();

            String idNumber = request.identity().idNumber();
            int year = example.dateOfBirth().getYear();
            assertThat(idNumber).hasSize(12).startsWith(example.province());
            assertThat(idNumber.charAt(3) - '0').as("century and gender of %s", example.fullName())
                    .isEqualTo((year >= 2000 ? 2 : 0) + (example.male() ? 0 : 1));
            assertThat(idNumber.substring(4, 6)).isEqualTo("%02d".formatted(year % 100));
            assertThat(idNumbers.add(idNumber)).as("unique CCCD of %s", example.fullName()).isTrue();
            assertThat(socialInsuranceNumbers.add(request.identity().socialInsuranceNumber())).isTrue();
        }
        assertThat(ExampleEmployees.EMPLOYEES).hasSizeBetween(35, 50)
                .extracting(ExampleEmployee::fullName).doesNotHaveDuplicates();
        // The heads: one per active unit.
        assertThat(ExampleEmployees.EMPLOYEES).filteredOn(ExampleEmployee::head)
                .extracting(ExampleEmployee::unitCode)
                .doesNotHaveDuplicates()
                .containsExactlyInAnyOrderElementsOf(ExampleDataSeeder.UNITS.stream()
                        .filter(ExampleUnit::active).map(ExampleUnit::code).toList());
    }

    @Test
    void nothingIsWrittenOnceAnyUnitExists() {
        when(orgUnitService.hasUnits()).thenReturn(true);

        run();

        verify(orgUnitService, never()).createAsSystem(any());
        verify(orgUnitService, never()).deactivateAsSystem(any());
        verify(employeeService, never()).createAsSystem(any());
        verify(legalEntityService, never()).fillDefaultCompanyInfo(any());
    }

    @Test
    void theCompanyWideLockIsTakenBeforeLookingForUnits() {
        when(orgUnitService.hasUnits()).thenReturn(true);

        run();

        InOrder order = inOrder(legalEntityService, orgUnitService);
        order.verify(legalEntityService).lockForStructureChange();
        order.verify(orgUnitService).hasUnits();
    }

    @Test
    void theExampleTreeHasTwentyUnitsOneOfThemInactiveAndIsThreeUnitsDeep() {
        List<ExampleUnit> units = ExampleDataSeeder.UNITS;

        assertThat(units).hasSize(20);
        assertThat(units).filteredOn(unit -> !unit.active()).extracting(ExampleUnit::code).containsExactly("GAME");
        assertThat(units).extracting(ExampleUnit::code).doesNotHaveDuplicates();

        // Every parent is listed before its children and is active (an inactive unit takes no child units).
        Map<String, Integer> depthByCode = new HashMap<>();
        Set<String> inactive = new HashSet<>();
        for (ExampleUnit unit : units) {
            if (unit.parentCode() == null) {
                depthByCode.put(unit.code(), 1);
            } else {
                assertThat(depthByCode).as("parent of %s comes first", unit.code()).containsKey(unit.parentCode());
                assertThat(inactive).as("parent of %s is active", unit.code()).doesNotContain(unit.parentCode());
                depthByCode.put(unit.code(), depthByCode.get(unit.parentCode()) + 1);
            }
            if (!unit.active()) {
                inactive.add(unit.code());
            }
        }
        // Company (not a unit) → branch → department → team.
        assertThat(depthByCode.values()).contains(3).allMatch(depth -> depth <= 3);
        assertThat(depthByCode).containsEntry("WEBDN", 3).containsEntry("PTPM", 1);
    }

    @Test
    void theExampleDataPassesTheSameValidationAsApiRequests() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            Validator validator = factory.getValidator();

            assertThat(validator.validate(ExampleDataSeeder.COMPANY)).isEmpty();
            for (ExampleUnit unit : ExampleDataSeeder.UNITS) {
                assertThat(validator.validate(unit.toRequest(null))).as(unit.code()).isEmpty();
            }
        }
    }

    private UUID positionId(String code) {
        return positionIdByCode.computeIfAbsent(code, any -> UUID.randomUUID());
    }

    private void run() {
        seeder.run(new DefaultApplicationArguments());
    }
}
