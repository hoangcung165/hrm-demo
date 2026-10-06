package com.hrmdemo.service.accessscope;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.DataScope;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.accessscope.PermissionGroup;
import com.hrmdemo.dto.accessscope.RoleMatrixResponse;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.RolePermissionOverrides.PermissionOverride;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.http.HttpStatus;

/** Phạm vi truy cập (PRD Testing Decisions, item 6). */
class AccessScopeServiceTest {

    static final UUID ME = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final UUID SOMEONE_ELSE = UUID.fromString("00000000-0000-0000-0000-000000000002");

    static final UUID MY_EMPLOYEE = UUID.fromString("00000000-0000-0000-0000-0000000000e1");
    static final UUID A_COLLEAGUE = UUID.fromString("00000000-0000-0000-0000-0000000000e2");
    /** The department the manager heads, a team below it, a sibling department and the branch above. */
    static final UUID MY_DEPARTMENT = UUID.fromString("00000000-0000-0000-0000-0000000000a1");
    static final UUID TEAM_BELOW = UUID.fromString("00000000-0000-0000-0000-0000000000a2");
    static final UUID SIBLING_DEPARTMENT = UUID.fromString("00000000-0000-0000-0000-0000000000a3");
    static final UUID BRANCH_ABOVE = UUID.fromString("00000000-0000-0000-0000-0000000000a4");

    /** The org structure seam: which units an Employee heads, with the units below. */
    final ManagedOrgUnits managedOrgUnits = mock(ManagedOrgUnits.class);
    final AccessScopeService service = new AccessScopeService(managedOrgUnits);

    @Test
    void anEmployeeSeesOnlySelf() {
        AccessScope scope = service.scopeOf(ME, Set.of(Role.EMPLOYEE));

        assertThat(scope.dataScope()).isEqualTo(DataScope.SELF);
        assertThat(scope.coversAccount(ME)).isTrue();
        assertThat(scope.coversAccount(SOMEONE_ELSE)).isFalse();
    }

    @Test
    void hrSeesTheWholeCompany() {
        AccessScope scope = service.scopeOf(ME, Set.of(Role.HR));

        assertThat(scope.dataScope()).isEqualTo(DataScope.COMPANY);
        assertThat(scope.coversAccount(ME)).isTrue();
        assertThat(scope.coversAccount(SOMEONE_ELSE)).isTrue();
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"ADMIN", "HR", "DIRECTOR", "ACCOUNTANT"})
    void companyWideRolesSeeTheWholeCompany(Role role) {
        assertThat(service.scopeOf(ME, Set.of(role)).dataScope()).isEqualTo(DataScope.COMPANY);
    }

    @Test
    void aManagerSeesOnlyTheUnitsTheyHeadAndTheUnitsBelow() {
        when(managedOrgUnits.unitIdsManagedBy(MY_EMPLOYEE)).thenReturn(Set.of(MY_DEPARTMENT, TEAM_BELOW));

        AccessScope scope = service.scopeOf(ME, MY_EMPLOYEE, Set.of(Role.LINE_MANAGER, Role.EMPLOYEE));

        assertThat(scope.dataScope()).isEqualTo(DataScope.ORG_UNIT);
        assertThat(scope.orgUnitIds()).containsExactlyInAnyOrder(MY_DEPARTMENT, TEAM_BELOW);
        assertThat(scope.coversOrgUnit(MY_DEPARTMENT)).isTrue();
        assertThat(scope.coversOrgUnit(TEAM_BELOW)).isTrue();
        assertThat(scope.coversOrgUnit(SIBLING_DEPARTMENT)).isFalse();
        assertThat(scope.coversOrgUnit(BRANCH_ABOVE)).isFalse();
        assertThatCode(() -> scope.requireOrgUnit(TEAM_BELOW)).doesNotThrowAnyException();
        assertForbidden(() -> scope.requireOrgUnit(SIBLING_DEPARTMENT));
    }

    @Test
    void aManagerSeesTheEmployeesOfTheirUnitsAndThemselvesButNobodyElse() {
        when(managedOrgUnits.unitIdsManagedBy(MY_EMPLOYEE)).thenReturn(Set.of(MY_DEPARTMENT, TEAM_BELOW));

        AccessScope scope = service.scopeOf(ME, MY_EMPLOYEE, Set.of(Role.LINE_MANAGER));

        assertThat(scope.coversEmployee(A_COLLEAGUE, TEAM_BELOW)).isTrue();
        assertThat(scope.coversEmployee(A_COLLEAGUE, SIBLING_DEPARTMENT)).isFalse();
        assertThat(scope.coversEmployee(A_COLLEAGUE, null)).as("a colleague who belongs to no unit").isFalse();
        // The manager's own record, even though their own unit (the branch above) is not one they head.
        assertThat(scope.coversEmployee(MY_EMPLOYEE, BRANCH_ABOVE)).isTrue();
        assertForbidden(() -> scope.requireEmployee(A_COLLEAGUE, SIBLING_DEPARTMENT));
        // Accounts of the unit's Employees come with HRM-06; until then a manager reads only their own.
        assertThat(scope.coversAccount(SOMEONE_ELSE)).isFalse();
    }

    @Test
    void aManagerWhoHeadsNoUnitSeesOnlySelf() {
        when(managedOrgUnits.unitIdsManagedBy(MY_EMPLOYEE)).thenReturn(Set.of());

        AccessScope scope = service.scopeOf(ME, MY_EMPLOYEE, Set.of(Role.LINE_MANAGER));

        assertThat(scope.dataScope()).isEqualTo(DataScope.ORG_UNIT);
        assertThat(scope.orgUnitIds()).isEmpty();
        assertThat(scope.coversOrgUnit(MY_DEPARTMENT)).isFalse();
        assertThat(scope.coversEmployee(A_COLLEAGUE, MY_DEPARTMENT)).isFalse();
        assertThat(scope.coversEmployee(MY_EMPLOYEE, MY_DEPARTMENT)).isTrue();
    }

    @Test
    void aManagerWhoseAccountHasNoEmployeeSeesOnlySelf() {
        AccessScope scope = service.scopeOf(ME, Set.of(Role.LINE_MANAGER));

        assertThat(scope.dataScope()).isEqualTo(DataScope.ORG_UNIT);
        assertThat(scope.orgUnitIds()).isEmpty();
        assertThat(scope.coversEmployee(A_COLLEAGUE, MY_DEPARTMENT)).isFalse();
        assertThat(scope.coversEmployee(null, null)).as("no Employee is never 'my own Employee'").isFalse();
        verifyNoInteractions(managedOrgUnits);
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"EMPLOYEE", "PROJECT_MANAGER"})
    void anEmployeeAndAProjectManagerSeeOnlySelfEvenWhenTheyHeadAUnit(Role role) {
        AccessScope scope = service.scopeOf(ME, MY_EMPLOYEE, Set.of(role));

        assertThat(scope.dataScope()).isEqualTo(DataScope.SELF);
        assertThat(scope.orgUnitIds()).isEmpty();
        assertThat(scope.coversOrgUnit(MY_DEPARTMENT)).isFalse();
        assertThat(scope.coversEmployee(A_COLLEAGUE, MY_DEPARTMENT)).isFalse();
        assertThat(scope.coversEmployee(MY_EMPLOYEE, MY_DEPARTMENT)).isTrue();
        assertThat(scope.coversAccount(SOMEONE_ELSE)).isFalse();
        // The unit scope comes from the Line manager role; without it the org structure is not even asked.
        verifyNoInteractions(managedOrgUnits);
    }

    @Test
    void companyScopeCoversEveryUnitAndEmployeeWithoutListingUnits() {
        AccessScope scope = service.scopeOf(ME, MY_EMPLOYEE, Set.of(Role.HR, Role.LINE_MANAGER));

        assertThat(scope.dataScope()).isEqualTo(DataScope.COMPANY);
        assertThat(scope.orgUnitIds()).isEmpty();
        assertThat(scope.coversOrgUnit(SIBLING_DEPARTMENT)).isTrue();
        assertThat(scope.coversEmployee(A_COLLEAGUE, null)).isTrue();
        verifyNoInteractions(managedOrgUnits);
    }

    @Test
    void theEmployeeFilterOfAListFollowsTheDataScope() {
        when(managedOrgUnits.unitIdsManagedBy(MY_EMPLOYEE)).thenReturn(Set.of(MY_DEPARTMENT, TEAM_BELOW));

        AccessScope.EmployeeFilter employee = service.scopeOf(ME, MY_EMPLOYEE, Set.of(Role.EMPLOYEE))
                .employeeFilter();
        assertThat(employee.all()).isFalse();
        assertThat(employee.orgUnitIds()).isEmpty();
        assertThat(employee.selfEmployeeId()).isEqualTo(MY_EMPLOYEE);

        AccessScope.EmployeeFilter manager = service.scopeOf(ME, MY_EMPLOYEE, Set.of(Role.LINE_MANAGER))
                .employeeFilter();
        assertThat(manager.all()).isFalse();
        assertThat(manager.orgUnitIds()).containsExactlyInAnyOrder(MY_DEPARTMENT, TEAM_BELOW);
        assertThat(manager.selfEmployeeId()).isEqualTo(MY_EMPLOYEE);

        AccessScope.EmployeeFilter hr = service.scopeOf(ME, MY_EMPLOYEE, Set.of(Role.HR)).employeeFilter();
        assertThat(hr.all()).isTrue();
        assertThat(hr.orgUnitIds()).isEmpty();

        // An Account without an Employee and without a wider scope has no Employee record to list.
        AccessScope.EmployeeFilter systemAccount = service.scopeOf(ME, Set.of(Role.EMPLOYEE)).employeeFilter();
        assertThat(systemAccount.all()).isFalse();
        assertThat(systemAccount.selfEmployeeId()).isNull();
    }

    @Test
    void anAccountWithSeveralRolesGetsTheWidestScope() {
        assertThat(service.scopeOf(ME, Set.of(Role.EMPLOYEE, Role.HR)).dataScope()).isEqualTo(DataScope.COMPANY);
        assertThat(service.scopeOf(ME, Set.of(Role.DIRECTOR, Role.LINE_MANAGER, Role.EMPLOYEE)).dataScope())
                .isEqualTo(DataScope.COMPANY);
        assertThat(service.scopeOf(ME, Set.of(Role.EMPLOYEE, Role.PROJECT_MANAGER)).dataScope())
                .isEqualTo(DataScope.SELF);
        assertThat(service.scopeOf(ME, Set.of(Role.EMPLOYEE, Role.LINE_MANAGER, Role.PROJECT_MANAGER)).dataScope())
                .isEqualTo(DataScope.ORG_UNIT);
    }

    @ParameterizedTest
    @EnumSource(Role.class)
    void everyRoleMayViewCompanyInfoAndAccounts(Role role) {
        assertThat(service.scopeOf(ME, Set.of(role)).permissions())
                .contains(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW);
    }

    @ParameterizedTest
    @EnumSource(Role.class)
    void onlyTheAdminMayEditCompanyInfo(Role role) {
        assertThat(service.scopeOf(ME, Set.of(role)).has(Permission.COMPANY_EDIT)).isEqualTo(role == Role.ADMIN);
    }

    @Test
    void permissionsOfSeveralRolesAddUp() {
        AccessScope scope = service.scopeOf(ME, Set.of(Role.EMPLOYEE, Role.ADMIN));

        assertThat(scope.permissions())
                .containsExactly(Permission.COMPANY_VIEW, Permission.COMPANY_EDIT, Permission.ACCOUNT_VIEW,
                        Permission.ACCOUNT_LIST, Permission.ACCOUNT_EDIT, Permission.ORG_VIEW, Permission.ORG_EDIT,
                        Permission.CATALOG_EDIT);
    }

    @ParameterizedTest
    @EnumSource(Role.class)
    void onlyTheAdminMayListAndManageAccounts(Role role) {
        AccessScope scope = service.scopeOf(ME, Set.of(role));

        assertThat(scope.has(Permission.ACCOUNT_LIST)).isEqualTo(role == Role.ADMIN);
        assertThat(scope.has(Permission.ACCOUNT_EDIT)).isEqualTo(role == Role.ADMIN);
    }

    @ParameterizedTest
    @EnumSource(Role.class)
    void adminHrAndDirectorSeeTheOrgStructureAndOnlyAdminAndHrMayChangeIt(Role role) {
        AccessScope scope = service.scopeOf(ME, Set.of(role));

        assertThat(scope.has(Permission.ORG_VIEW))
                .isEqualTo(role == Role.ADMIN || role == Role.HR || role == Role.DIRECTOR);
        assertThat(scope.has(Permission.ORG_EDIT)).isEqualTo(role == Role.ADMIN || role == Role.HR);
    }

    @Test
    void anAccountWithoutRolesSeesOnlySelfAndCannotEdit() {
        AccessScope scope = service.scopeOf(ME, Set.of());

        assertThat(scope.dataScope()).isEqualTo(DataScope.SELF);
        assertThat(scope.permissions()).containsExactly(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW);
    }

    @Test
    void theScopeIsBuiltFromTheRoleNamesOfTheSignedInAccountAndUnknownNamesAreIgnored() {
        AccessScope scope = service.scopeOf(new CurrentAccount(ME, Set.of("HR", "NOT_A_ROLE")));

        assertThat(scope.accountId()).isEqualTo(ME);
        assertThat(scope.dataScope()).isEqualTo(DataScope.COMPANY);
        assertThat(service.scopeOfRoleNames(ME, null, List.of("NOT_A_ROLE")).dataScope()).isEqualTo(DataScope.SELF);
    }

    @Test
    void theUnitScopeOfTheSignedInAccountComesFromItsEmployee() {
        when(managedOrgUnits.unitIdsManagedBy(MY_EMPLOYEE)).thenReturn(Set.of(MY_DEPARTMENT));

        AccessScope scope = service.scopeOf(new CurrentAccount(ME, MY_EMPLOYEE, Set.of("LINE_MANAGER")));

        assertThat(scope.employeeId()).isEqualTo(MY_EMPLOYEE);
        assertThat(scope.orgUnitIds()).containsExactly(MY_DEPARTMENT);
    }

    @Test
    void theRoleMatrixListsEveryRoleInAFixedOrderAndEveryPermissionWithItsGroup() {
        RoleMatrixResponse matrix = service.roleMatrix(new CurrentAccount(ME, Set.of("ADMIN")));

        assertThat(matrix.roles()).extracting(RoleMatrixResponse.RoleRule::role)
                .containsExactly("ADMIN", "HR", "LINE_MANAGER", "PROJECT_MANAGER", "ACCOUNTANT", "DIRECTOR",
                        "EMPLOYEE");
        assertThat(matrix.roles()).extracting(RoleMatrixResponse.RoleRule::dataScope)
                .containsExactly(DataScope.COMPANY, DataScope.COMPANY, DataScope.ORG_UNIT, DataScope.SELF,
                        DataScope.COMPANY, DataScope.COMPANY, DataScope.SELF);
        assertThat(matrix.roles().get(0).permissions()).containsExactly(Permission.values());
        assertThat(matrix.roles().get(1).permissions())
                .containsExactly(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW, Permission.ORG_VIEW,
                        Permission.ORG_EDIT);
        assertThat(matrix.roles().get(6).permissions())
                .containsExactly(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW);

        assertThat(matrix.permissions()).extracting(RoleMatrixResponse.PermissionInfo::permission)
                .containsExactly(Permission.values());
        assertThat(matrix.permissions()).extracting(RoleMatrixResponse.PermissionInfo::group)
                .containsExactly(PermissionGroup.COMPANY, PermissionGroup.COMPANY, PermissionGroup.ACCOUNT,
                        PermissionGroup.ACCOUNT, PermissionGroup.ACCOUNT, PermissionGroup.ORG, PermissionGroup.ORG,
                        PermissionGroup.CATALOG);
        // Asking for the rules never looks at the org structure.
        verifyNoInteractions(managedOrgUnits);
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = "ADMIN", mode = EnumSource.Mode.EXCLUDE)
    void theRoleMatrixIsForbiddenWithoutThePermissionToListAccounts(Role role) {
        assertForbidden(() -> service.roleMatrix(new CurrentAccount(ME, Set.of(role.name()))));
    }

    @Test
    void requiringSomethingOutsideTheScopeIsForbidden() {
        AccessScope employee = service.scopeOf(ME, Set.of(Role.EMPLOYEE));

        assertThatCode(() -> employee.requireAccount(ME)).doesNotThrowAnyException();
        assertThatCode(() -> employee.require(Permission.COMPANY_VIEW)).doesNotThrowAnyException();
        assertForbidden(() -> employee.requireAccount(SOMEONE_ELSE));
        assertForbidden(() -> employee.require(Permission.COMPANY_EDIT));
    }

    // --- permissions a company has changed ---

    @Test
    void aCompanyCanGiveARoleAPermissionAndTakeOneAway() {
        AccessScopeService customized = withOverrides(
                new PermissionOverride(Role.HR, Permission.ACCOUNT_LIST, true),
                new PermissionOverride(Role.HR, Permission.ORG_EDIT, false));

        AccessScope hr = customized.scopeOf(ME, Set.of(Role.HR));

        assertThat(hr.permissions()).containsExactly(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW,
                Permission.ACCOUNT_LIST, Permission.ORG_VIEW);
        // The data scope is fixed per role and other roles are untouched.
        assertThat(hr.dataScope()).isEqualTo(DataScope.COMPANY);
        assertThat(customized.scopeOf(ME, Set.of(Role.DIRECTOR)).permissions())
                .containsExactly(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW, Permission.ORG_VIEW);
    }

    @Test
    void aPermissionWithoutARowFollowsTheDefaultOfItsRole() {
        // The rule that lets a later release add a permission: only an explicit row departs from the default.
        AccessScopeService customized = withOverrides(new PermissionOverride(Role.HR, Permission.ACCOUNT_LIST, true));

        assertThat(customized.permissionsByRole().get(Role.HR))
                .containsExactly(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW, Permission.ACCOUNT_LIST,
                        Permission.ORG_VIEW, Permission.ORG_EDIT);
        assertThat(customized.permissionsByRole().get(Role.EMPLOYEE))
                .isEqualTo(AccessScopeService.defaultPermissions(Role.EMPLOYEE));
    }

    @Test
    void theAdminRoleAndTheBasePermissionsCannotBeChangedByARow() {
        AccessScopeService customized = withOverrides(
                new PermissionOverride(Role.ADMIN, Permission.ACCOUNT_EDIT, false),
                new PermissionOverride(Role.EMPLOYEE, Permission.COMPANY_VIEW, false),
                new PermissionOverride(Role.EMPLOYEE, Permission.ACCOUNT_VIEW, false));

        assertThat(customized.scopeOf(ME, Set.of(Role.ADMIN)).permissions()).containsExactly(Permission.values());
        assertThat(customized.scopeOf(ME, Set.of(Role.EMPLOYEE)).permissions())
                .containsExactly(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW);
        assertThat(customized.roleMatrix(new CurrentAccount(ME, Set.of("ADMIN"))).customized()).isFalse();
    }

    @Test
    void severalRolesAddUpTheirChangedPermissions() {
        AccessScopeService customized = withOverrides(
                new PermissionOverride(Role.EMPLOYEE, Permission.ORG_VIEW, true),
                new PermissionOverride(Role.HR, Permission.ORG_EDIT, false),
                new PermissionOverride(Role.HR, Permission.ORG_VIEW, false));

        // HR lost the org permissions, but the Account is also an Employee, and Employees were given the view.
        assertThat(customized.scopeOf(ME, Set.of(Role.HR, Role.EMPLOYEE)).permissions())
                .containsExactly(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW, Permission.ORG_VIEW);
    }

    @Test
    void theMatrixShowsTheEffectivePermissionsAndSaysWhetherTheyDifferFromTheDefaults() {
        CurrentAccount admin = new CurrentAccount(ME, Set.of("ADMIN"));

        RoleMatrixResponse defaults = service.roleMatrix(admin);
        assertThat(defaults.customized()).isFalse();

        RoleMatrixResponse changed = withOverrides(new PermissionOverride(Role.DIRECTOR, Permission.ACCOUNT_LIST, true))
                .roleMatrix(admin);
        assertThat(changed.customized()).isTrue();
        assertThat(changed.roles().get(5).role()).isEqualTo("DIRECTOR");
        assertThat(changed.roles().get(5).permissions()).containsExactly(Permission.COMPANY_VIEW,
                Permission.ACCOUNT_VIEW, Permission.ACCOUNT_LIST, Permission.ORG_VIEW);
        assertThat(changed.roles().get(5).dataScope()).isEqualTo(DataScope.COMPANY);

        // A row that says what the default already says changes nothing.
        assertThat(withOverrides(new PermissionOverride(Role.DIRECTOR, Permission.ORG_VIEW, true))
                .roleMatrix(admin).customized()).isFalse();
    }

    @Test
    void theMatrixMarksTheLockedRoleTheBasePermissionsAndWhatEachPermissionRequires() {
        RoleMatrixResponse matrix = service.roleMatrix(new CurrentAccount(ME, Set.of("ADMIN")));

        assertThat(matrix.roles()).extracting(RoleMatrixResponse.RoleRule::locked)
                .containsExactly("ADMIN_ALL", null, null, null, null, null, null);
        assertThat(matrix.permissions()).extracting(RoleMatrixResponse.PermissionInfo::locked)
                .containsExactly("BASE", null, "BASE", null, null, null, null, null);
        assertThat(matrix.permissions()).extracting(RoleMatrixResponse.PermissionInfo::requires)
                .containsExactly(null, Permission.COMPANY_VIEW, null, null, Permission.ACCOUNT_LIST, null,
                        Permission.ORG_VIEW, null);
    }

    @Test
    void theStoredChangesAreReadOncePerScopeAndNotAtAllWhereOnlyTheDataScopeIsAsked() {
        RolePermissionOverrides overrides = mock(RolePermissionOverrides.class);
        when(overrides.all()).thenReturn(List.of());
        AccessScopeService counting = new AccessScopeService(managedOrgUnits, overrides);

        counting.scopeOf(ME, Set.of(Role.HR, Role.EMPLOYEE));
        verify(overrides, times(1)).all();

        // A row of the Account list, and an Account without roles: nothing to read.
        assertThat(counting.widestDataScope(List.of("HR", "EMPLOYEE"))).isEqualTo(DataScope.COMPANY);
        assertThat(counting.scopeOf(ME, Set.of()).permissions())
                .containsExactly(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW);
        verify(overrides, times(1)).all();
    }

    private AccessScopeService withOverrides(PermissionOverride... overrides) {
        return new AccessScopeService(managedOrgUnits, () -> List.of(overrides));
    }

    private static void assertForbidden(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(ex.getCode()).isEqualTo("auth.forbidden");
        });
    }
}
