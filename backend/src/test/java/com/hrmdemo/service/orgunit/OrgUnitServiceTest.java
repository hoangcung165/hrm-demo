package com.hrmdemo.service.orgunit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.legalentity.CompanyInfoResponse;
import com.hrmdemo.dto.orgunit.OrgStructureResponse;
import com.hrmdemo.dto.orgunit.OrgUnitCreateRequest;
import com.hrmdemo.dto.orgunit.OrgUnitHead;
import com.hrmdemo.dto.orgunit.OrgUnitMoveRequest;
import com.hrmdemo.dto.orgunit.OrgUnitRef;
import com.hrmdemo.dto.orgunit.OrgUnitResponse;
import com.hrmdemo.dto.orgunit.OrgUnitUpdateRequest;
import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.orgunit.OrgUnitType;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.mapper.orgunit.OrgUnitMapper;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.legalentity.LegalEntityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mapstruct.factory.Mappers;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Rules of the org tree, in business terms. The stored units are a plain list behind the mocked repository;
 * Employees come from the mocked {@link OrgUnitMembers} seam (HRM-06 supplies the real one).
 */
@ExtendWith(MockitoExtension.class)
class OrgUnitServiceTest {

    static final Instant EARLIER = Instant.parse("2026-10-01T08:00:00Z");
    static final Instant NOW = Instant.parse("2026-10-04T08:00:00Z");
    static final CurrentAccount HR = account("HR");
    static final UUID EMPLOYEE_ID = UUID.fromString("00000000-0000-0000-0000-0000000000e1");
    static final OrgUnitHead HEAD = new OrgUnitHead(EMPLOYEE_ID, "Tran Thi B", "NV0002", "Engineering Manager", null);

    @Mock
    OrgUnitRepository orgUnits;
    @Mock
    OrgUnitMembers members;
    @Mock
    LegalEntityService legalEntityService;

    /** What the repository holds. */
    final List<OrgUnit> stored = new ArrayList<>();

    OrgUnitService service;

    @BeforeEach
    void setUp() {
        service = new OrgUnitService(orgUnits, members, legalEntityService, new AccessScopeService(),
                Mappers.getMapper(OrgUnitMapper.class), Clock.fixed(NOW, ZoneOffset.UTC));
        lenient().when(orgUnits.findAll()).thenAnswer(call -> new ArrayList<>(stored));
        lenient().when(orgUnits.save(any(OrgUnit.class))).thenAnswer(call -> {
            OrgUnit unit = call.getArgument(0);
            ReflectionTestUtils.setField(unit, "id", UUID.randomUUID());
            stored.add(unit);
            return unit;
        });
        lenient().when(legalEntityService.companyInfo())
                .thenReturn(new CompanyInfoResponse("Acme", null, null, null, null, null, NOW));
        // No Employees unless a test says otherwise.
        lenient().when(members.headcountByOrgUnit()).thenReturn(Map.of());
        lenient().when(members.findHeads(anyCollection())).thenReturn(Map.of());
        lenient().when(members.findHead(any())).thenReturn(Optional.empty());
    }

    // --- Create ---

    @Test
    void aUnitIsCreatedDirectlyUnderTheCompany() {
        OrgUnitResponse created = service.create(HR, createRequest("Engineering", "ENG", null));

        assertThat(created.id()).isNotNull();
        assertThat(created.parentId()).isNull();
        assertThat(created.name()).isEqualTo("Engineering");
        assertThat(created.code()).isEqualTo("ENG");
        assertThat(created.type()).isEqualTo("DEPARTMENT");
        assertThat(created.active()).as("new units start active").isTrue();
        assertThat(created.head()).isNull();
        assertThat(created.childCount()).isZero();
        assertThat(stored).hasSize(1);
    }

    @Test
    void aTreeOfSeveralLevelsIsBuiltByCreatingUnitsUnderUnits() {
        OrgUnitResponse branch = service.create(HR, createRequest("Da Nang branch", "DN", null));
        OrgUnitResponse department = service.create(HR, createRequest("Engineering", "ENG", branch.id()));
        OrgUnitResponse team = service.create(HR, createRequest("QA team", "QA", department.id()));

        assertThat(department.parentId()).isEqualTo(branch.id());
        assertThat(team.parentId()).isEqualTo(department.id());

        OrgStructureResponse structure = service.structure(HR);
        assertThat(structure.units()).extracting(OrgUnitResponse::code).containsExactly("DN", "ENG", "QA");
        assertThat(structure.units()).extracting(OrgUnitResponse::childCount).containsExactly(1, 1, 0);
        assertThat(structure.root().childCount()).isEqualTo(1);
    }

    @Test
    void newUnitsGoLastAmongTheirSiblings() {
        UUID first = service.create(HR, createRequest("Zeta", "ZZ", null)).id();
        UUID second = service.create(HR, createRequest("Alpha", "AA", null)).id();

        assertThat(service.structure(HR).units()).extracting(OrgUnitResponse::id).containsExactly(first, second);
    }

    @Test
    void siblingsWithTheSameSortOrderAreListedByName() {
        unit(null, "B2", "beta", 1);
        unit(null, "A1", "Alpha", 1);
        unit(null, "C3", "Gamma", 0);

        assertThat(service.structure(HR).units()).extracting(OrgUnitResponse::name)
                .containsExactly("Gamma", "Alpha", "beta");
    }

    @Test
    void aUnitCannotBeCreatedUnderAParentThatDoesNotExist() {
        assertCode(() -> service.create(HR, createRequest("QA team", "QA", UUID.randomUUID())),
                400, "org_unit.parent_not_found");

        verify(orgUnits, never()).save(any());
    }

    @Test
    void aUnitCannotBeCreatedUnderAnInactiveParent() {
        OrgUnit closed = unit(null, "OLD", "Closed department");
        closed.deactivate(EARLIER);

        assertCode(() -> service.create(HR, createRequest("QA team", "QA", closed.getId())),
                409, "org_unit.parent_inactive");

        verify(orgUnits, never()).save(any());
    }

    // --- Code ---

    @Test
    void aCodeIsUniqueInTheCompanyWhateverTheCaseAndTheErrorNamesItsHolder() {
        OrgUnit holder = unit(null, "QA", "Testing team");
        OrgUnit other = unit(null, "ENG", "Engineering");

        assertThatThrownBy(() -> service.create(HR, createRequest("Quality", " qa ", other.getId())))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus().value()).isEqualTo(409);
                    assertThat(ex.getCode()).isEqualTo("org_unit.code_taken");
                    assertThat(ex.getProperties().get("holder"))
                            .isEqualTo(new OrgUnitRef(holder.getId(), "QA", "Testing team"));
                });
        assertCode(() -> service.update(HR, other.getId(), updateRequest("Engineering", "Qa", null)),
                409, "org_unit.code_taken");

        verify(orgUnits, never()).save(any());
        assertThat(other.getCode()).isEqualTo("ENG");
    }

    @Test
    void aCodeIsStoredInUpperCase() {
        assertThat(service.create(HR, createRequest("Engineering", "eng-1", null)).code()).isEqualTo("ENG-1");
    }

    // --- Edit ---

    @Test
    void editingChangesNameCodeAndTypeButNeitherTheParentNorTheStatus() {
        OrgUnit parent = unit(null, "ENG", "Engineering");
        OrgUnit team = unit(parent.getId(), "QA", "QA team");
        team.deactivate(EARLIER);

        OrgUnitResponse updated = service.update(HR, team.getId(),
                new OrgUnitUpdateRequest("  Quality  ", "qc", "TEAM", null));

        assertThat(updated.name()).isEqualTo("Quality");
        assertThat(updated.code()).isEqualTo("QC");
        assertThat(updated.type()).isEqualTo("TEAM");
        assertThat(updated.parentId()).isEqualTo(parent.getId());
        assertThat(updated.active()).isFalse();
        assertThat(team.getUpdatedAt()).isEqualTo(NOW);
    }

    @Test
    void aUnitKeepsItsOwnCodeWhenEdited() {
        OrgUnit team = unit(null, "QA", "QA team");

        assertThat(service.update(HR, team.getId(), updateRequest("Quality", "QA", null)).name())
                .isEqualTo("Quality");
    }

    @Test
    void editingAUnitThatDoesNotExistIsNotFound() {
        assertCode(() -> service.update(HR, UUID.randomUUID(), updateRequest("Quality", "QA", null)),
                404, "org_unit.not_found");
    }

    // --- Head ---

    @Test
    void untilEmployeesExistAHeadCannotBeAssigned() {
        OrgUnit team = unit(null, "QA", "QA team");
        var noEmployees = new OrgUnitService(orgUnits, new NoEmployeesYet(), legalEntityService,
                new AccessScopeService(), Mappers.getMapper(OrgUnitMapper.class), Clock.fixed(NOW, ZoneOffset.UTC));

        assertCode(() -> noEmployees.update(HR, team.getId(), updateRequest("QA team", "QA", EMPLOYEE_ID)),
                400, "org_unit.head_not_found");
        assertCode(() -> noEmployees.create(HR,
                new OrgUnitCreateRequest("Engineering", "ENG", "DEPARTMENT", null, EMPLOYEE_ID)),
                400, "org_unit.head_not_found");

        assertThat(team.getHeadEmployeeId()).isNull();
        verify(orgUnits, never()).save(any());
    }

    @Test
    void anyActiveEmployeeOfTheCompanyCanBeMadeHeadAndTheUnitShowsThem() {
        OrgUnit team = unit(null, "QA", "QA team");
        when(members.findHead(EMPLOYEE_ID)).thenReturn(Optional.of(HEAD));
        when(members.findHeads(List.of(EMPLOYEE_ID))).thenReturn(Map.of(EMPLOYEE_ID, HEAD));

        OrgUnitResponse updated = service.update(HR, team.getId(), updateRequest("QA team", "QA", EMPLOYEE_ID));

        assertThat(updated.head()).isEqualTo(HEAD);
        assertThat(team.getHeadEmployeeId()).isEqualTo(EMPLOYEE_ID);
        assertThat(service.structure(HR).units().getFirst().head()).isEqualTo(HEAD);
    }

    @Test
    void aUnitCanStillBeEditedAfterItsHeadStoppedBeingAnActiveEmployee() {
        OrgUnit team = unit(null, "QA", "QA team");
        team.update("QA team", "QA", OrgUnitType.TEAM, EMPLOYEE_ID, EARLIER);
        // findHead answers "no such active Employee" (the default of this test class).

        OrgUnitResponse updated = service.update(HR, team.getId(), updateRequest("Quality", "QA", EMPLOYEE_ID));

        assertThat(updated.name()).isEqualTo("Quality");
        assertThat(team.getHeadEmployeeId()).isEqualTo(EMPLOYEE_ID);
    }

    @Test
    void theHeadIsRemovedByEditingWithoutOne() {
        OrgUnit team = unit(null, "QA", "QA team");
        team.update("QA team", "QA", OrgUnitType.TEAM, EMPLOYEE_ID, EARLIER);

        assertThat(service.update(HR, team.getId(), updateRequest("QA team", "QA", null)).head()).isNull();
        assertThat(team.getHeadEmployeeId()).isNull();
    }

    // --- Move ---

    @Test
    void aUnitMovesToAnotherParentWithItsChildUnitsHeadAndCode() {
        OrgUnit engineering = unit(null, "ENG", "Engineering");
        OrgUnit operations = unit(null, "OPS", "Operations");
        OrgUnit platform = unit(engineering.getId(), "PLAT", "Platform");
        platform.update("Platform", "PLAT", OrgUnitType.TEAM, EMPLOYEE_ID, EARLIER);
        OrgUnit sre = unit(platform.getId(), "SRE", "SRE");
        unit(operations.getId(), "IT", "IT support", 7);

        OrgUnitResponse moved = service.move(HR, platform.getId(), new OrgUnitMoveRequest(operations.getId()));

        assertThat(moved.parentId()).isEqualTo(operations.getId());
        assertThat(moved.code()).isEqualTo("PLAT");
        assertThat(moved.childCount()).isEqualTo(1);
        assertThat(moved.sortOrder()).as("last among the new siblings").isEqualTo(8);
        assertThat(platform.getHeadEmployeeId()).isEqualTo(EMPLOYEE_ID);
        assertThat(sre.getParentId()).isEqualTo(platform.getId());
        assertThat(service.structure(HR).units()).extracting(OrgUnitResponse::code)
                .containsExactly("ENG", "OPS", "IT", "PLAT", "SRE");
    }

    @Test
    void aUnitMovesDirectlyUnderTheCompany() {
        OrgUnit engineering = unit(null, "ENG", "Engineering");
        OrgUnit platform = unit(engineering.getId(), "PLAT", "Platform");

        OrgUnitResponse moved = service.move(HR, platform.getId(), new OrgUnitMoveRequest(null));

        assertThat(moved.parentId()).isNull();
        assertThat(service.structure(HR).root().childCount()).isEqualTo(2);
    }

    @Test
    void aUnitCannotBeMovedIntoItself() {
        OrgUnit engineering = unit(null, "ENG", "Engineering");

        assertCode(() -> service.move(HR, engineering.getId(), new OrgUnitMoveRequest(engineering.getId())),
                409, "org_unit.move_into_self_or_descendant");

        assertThat(engineering.getParentId()).isNull();
    }

    @Test
    void aUnitCannotBeMovedIntoAUnitBelowIt() {
        OrgUnit engineering = unit(null, "ENG", "Engineering");
        OrgUnit platform = unit(engineering.getId(), "PLAT", "Platform");
        OrgUnit sre = unit(platform.getId(), "SRE", "SRE");

        assertCode(() -> service.move(HR, engineering.getId(), new OrgUnitMoveRequest(platform.getId())),
                409, "org_unit.move_into_self_or_descendant");
        assertCode(() -> service.move(HR, engineering.getId(), new OrgUnitMoveRequest(sre.getId())),
                409, "org_unit.move_into_self_or_descendant");

        assertThat(engineering.getParentId()).isNull();
    }

    @Test
    void aUnitCannotBeMovedUnderAnInactiveParent() {
        OrgUnit engineering = unit(null, "ENG", "Engineering");
        OrgUnit closed = unit(null, "OLD", "Closed department");
        closed.deactivate(EARLIER);

        assertCode(() -> service.move(HR, engineering.getId(), new OrgUnitMoveRequest(closed.getId())),
                409, "org_unit.parent_inactive");

        assertThat(engineering.getParentId()).isNull();
    }

    @Test
    void aUnitCannotBeMovedUnderAParentThatDoesNotExist() {
        OrgUnit engineering = unit(null, "ENG", "Engineering");

        assertCode(() -> service.move(HR, engineering.getId(), new OrgUnitMoveRequest(UUID.randomUUID())),
                400, "org_unit.parent_not_found");
    }

    @Test
    void movingAUnitToWhereItAlreadyIsChangesNothing() {
        OrgUnit engineering = unit(null, "ENG", "Engineering");
        OrgUnit platform = unit(engineering.getId(), "PLAT", "Platform", 3);

        OrgUnitResponse moved = service.move(HR, platform.getId(), new OrgUnitMoveRequest(engineering.getId()));

        assertThat(moved.sortOrder()).isEqualTo(3);
        assertThat(platform.getUpdatedAt()).isEqualTo(EARLIER);
    }

    // --- Deactivate / reactivate ---

    @Test
    void deactivatingAUnitDoesNotDeactivateItsChildUnits() {
        OrgUnit engineering = unit(null, "ENG", "Engineering");
        OrgUnit platform = unit(engineering.getId(), "PLAT", "Platform");

        OrgUnitResponse deactivated = service.deactivate(HR, engineering.getId());

        assertThat(deactivated.active()).isFalse();
        assertThat(deactivated.childCount()).isEqualTo(1);
        assertThat(platform.isActive()).isTrue();
        assertThat(service.structure(HR).summary().activeUnitCount()).isEqualTo(1);
    }

    @Test
    void anInactiveUnitIsReactivatedEvenUnderAnInactiveParent() {
        OrgUnit engineering = unit(null, "ENG", "Engineering");
        OrgUnit platform = unit(engineering.getId(), "PLAT", "Platform");
        engineering.deactivate(EARLIER);
        platform.deactivate(EARLIER);

        assertThat(service.reactivate(HR, platform.getId()).active()).isTrue();
        assertThat(engineering.isActive()).isFalse();
    }

    // --- Delete ---

    @Test
    void anEmptyUnitIsDeleted() {
        OrgUnit team = unit(null, "QA", "QA team");

        service.delete(HR, team.getId());

        verify(orgUnits).delete(team);
    }

    @Test
    void aUnitWithChildUnitsCannotBeDeletedEvenWhenTheyAreInactive() {
        OrgUnit engineering = unit(null, "ENG", "Engineering");
        unit(engineering.getId(), "PLAT", "Platform");
        unit(engineering.getId(), "OLD", "Closed team").deactivate(EARLIER);

        assertNotEmpty(() -> service.delete(HR, engineering.getId()), 0L, 2);

        verify(orgUnits, never()).delete(any());
    }

    @Test
    void aUnitWithEmployeesCannotBeDeleted() {
        OrgUnit team = unit(null, "QA", "QA team");
        when(members.countAssigned(team.getId())).thenReturn(3L);

        assertNotEmpty(() -> service.delete(HR, team.getId()), 3L, 0);

        verify(orgUnits, never()).delete(any());
    }

    @Test
    void deletingAUnitThatDoesNotExistIsNotFound() {
        assertCode(() -> service.delete(HR, UUID.randomUUID()), 404, "org_unit.not_found");
    }

    // --- Org chart: tree, heads, headcounts ---

    @Test
    void aUnitsHeadcountIncludesEveryUnitBelowIt() {
        OrgUnit engineering = unit(null, "ENG", "Engineering");
        OrgUnit platform = unit(engineering.getId(), "PLAT", "Platform");
        OrgUnit sre = unit(platform.getId(), "SRE", "SRE");
        OrgUnit closed = unit(engineering.getId(), "OLD", "Closed team");
        closed.deactivate(EARLIER);
        OrgUnit sales = unit(null, "SALES", "Sales");
        when(members.headcountByOrgUnit()).thenReturn(Map.of(
                engineering.getId(), 2L, platform.getId(), 5L, sre.getId(), 4L, closed.getId(), 1L));
        // 12 people in units, 3 more belong to no unit.
        when(members.companyHeadcount()).thenReturn(15L);

        OrgStructureResponse structure = service.structure(HR);

        assertThat(headcounts(structure, engineering)).containsExactly(2L, 12L);
        assertThat(headcounts(structure, platform)).containsExactly(5L, 9L);
        assertThat(headcounts(structure, sre)).containsExactly(4L, 4L);
        assertThat(headcounts(structure, closed)).containsExactly(1L, 1L);
        assertThat(headcounts(structure, sales)).containsExactly(0L, 0L);
        assertThat(structure.root().headcountDirect()).isEqualTo(3);
        assertThat(structure.root().headcountTotal()).isEqualTo(15);
        assertThat(structure.summary().employeeCount()).isEqualTo(15);
        assertThat(structure.summary().activeUnitCount()).isEqualTo(4);
    }

    @Test
    void theCompanyIsTheTopOfTheTreeWithItsLegalRepresentativeAsHead() {
        when(legalEntityService.companyInfo()).thenReturn(
                new CompanyInfoResponse("Acme Software JSC", null, null, "Nguyen Van A", "Director", null, NOW));

        OrgStructureResponse structure = service.structure(account("DIRECTOR"));

        assertThat(structure.root().name()).isEqualTo("Acme Software JSC");
        assertThat(structure.root().type()).isEqualTo("COMPANY");
        assertThat(structure.root().head()).isEqualTo(new OrgUnitHead(null, "Nguyen Van A", null, "Director", null));
        assertThat(structure.root().childCount()).isZero();
        assertThat(structure.units()).isEmpty();
        assertThat(structure.summary().activeUnitCount()).isZero();
    }

    @Test
    void theCompanyNodeHasNoHeadWhenNoLegalRepresentativeIsRecorded() {
        assertThat(service.structure(HR).root().head()).isNull();
    }

    // --- Permissions ---

    @ParameterizedTest
    @ValueSource(strings = {"ADMIN", "HR"})
    void adminAndHrMayChangeTheOrgStructure(String role) {
        assertThat(service.create(account(role), createRequest("Engineering", "ENG", null)).id()).isNotNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"DIRECTOR", "ACCOUNTANT", "LINE_MANAGER", "PROJECT_MANAGER", "EMPLOYEE"})
    void nobodyButAdminAndHrMayChangeTheOrgStructure(String role) {
        CurrentAccount caller = account(role);
        UUID id = UUID.randomUUID();

        assertCode(() -> service.create(caller, createRequest("Engineering", "ENG", null)), 403, "auth.forbidden");
        assertCode(() -> service.update(caller, id, updateRequest("Engineering", "ENG", null)), 403, "auth.forbidden");
        assertCode(() -> service.move(caller, id, new OrgUnitMoveRequest(null)), 403, "auth.forbidden");
        assertCode(() -> service.deactivate(caller, id), 403, "auth.forbidden");
        assertCode(() -> service.reactivate(caller, id), 403, "auth.forbidden");
        assertCode(() -> service.delete(caller, id), 403, "auth.forbidden");

        verifyNoInteractions(orgUnits, legalEntityService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCOUNTANT", "LINE_MANAGER", "PROJECT_MANAGER", "EMPLOYEE"})
    void onlyAdminHrAndDirectorSeeTheOrgStructure(String role) {
        assertCode(() -> service.structure(account(role)), 403, "auth.forbidden");

        verifyNoInteractions(orgUnits);
    }

    // --- Concurrency ---

    @Test
    void everyChangeTakesTheCompanyWideLockBeforeItReadsTheUnits() {
        OrgUnit team = unit(null, "QA", "QA team");

        service.move(HR, team.getId(), new OrgUnitMoveRequest(null));

        InOrder order = inOrder(legalEntityService, orgUnits);
        order.verify(legalEntityService).lockForStructureChange();
        order.verify(orgUnits).findAll();
    }

    // --- Helpers ---

    /** A stored, active department. */
    private OrgUnit unit(UUID parentId, String code, String name) {
        return unit(parentId, code, name, 0);
    }

    private OrgUnit unit(UUID parentId, String code, String name, int sortOrder) {
        OrgUnit unit = new OrgUnit(parentId, code, name, OrgUnitType.DEPARTMENT, null, sortOrder, EARLIER);
        ReflectionTestUtils.setField(unit, "id", UUID.randomUUID());
        stored.add(unit);
        return unit;
    }

    private static OrgUnitCreateRequest createRequest(String name, String code, UUID parentId) {
        return new OrgUnitCreateRequest(name, code, "DEPARTMENT", parentId, null);
    }

    private static OrgUnitUpdateRequest updateRequest(String name, String code, UUID headEmployeeId) {
        return new OrgUnitUpdateRequest(name, code, "DEPARTMENT", headEmployeeId);
    }

    /** Direct and total headcount of a unit, in that order. */
    private static List<Long> headcounts(OrgStructureResponse structure, OrgUnit unit) {
        OrgUnitResponse response = structure.units().stream()
                .filter(candidate -> candidate.id().equals(unit.getId()))
                .findFirst()
                .orElseThrow();
        return List.of(response.headcountDirect(), response.headcountTotal());
    }

    private static CurrentAccount account(String role) {
        return new CurrentAccount(UUID.randomUUID(), Set.of(role));
    }

    private static void assertNotEmpty(Runnable action, long employeeCount, int childCount) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getStatus().value()).isEqualTo(409);
            assertThat(ex.getCode()).isEqualTo("org_unit.not_empty");
            assertThat(ex.getProperties()).containsEntry("employeeCount", employeeCount)
                    .containsEntry("childCount", childCount);
        });
    }

    private static void assertCode(Runnable action, int status, String code) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getStatus().value()).isEqualTo(status);
            assertThat(ex.getCode()).isEqualTo(code);
        });
    }
}
