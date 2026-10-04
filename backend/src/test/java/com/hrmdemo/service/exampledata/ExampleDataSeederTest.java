package com.hrmdemo.service.exampledata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.orgunit.OrgUnitCreateRequest;
import com.hrmdemo.dto.orgunit.OrgUnitResponse;
import com.hrmdemo.service.exampledata.ExampleDataSeeder.ExampleUnit;
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

    /** Units the mocked service was asked to create, in order, and the id it gave each code. */
    final List<OrgUnitCreateRequest> created = new ArrayList<>();
    final Map<String, UUID> idByCode = new HashMap<>();

    ExampleDataSeeder seeder;

    @BeforeEach
    void setUp() {
        seeder = new ExampleDataSeeder(orgUnitService, legalEntityService);
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

        InOrder order = inOrder(orgUnitService);
        order.verify(orgUnitService).createAsSystem(ExampleDataSeeder.UNITS.getLast().toRequest(idByCode.get("CNDN")));
        order.verify(orgUnitService).deactivateAsSystem(idByCode.get("GAME"));
        order.verifyNoMoreInteractions();
    }

    @Test
    void nothingIsWrittenOnceAnyUnitExists() {
        when(orgUnitService.hasUnits()).thenReturn(true);

        run();

        verify(orgUnitService, never()).createAsSystem(any());
        verify(orgUnitService, never()).deactivateAsSystem(any());
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

    private void run() {
        seeder.run(new DefaultApplicationArguments());
    }
}
