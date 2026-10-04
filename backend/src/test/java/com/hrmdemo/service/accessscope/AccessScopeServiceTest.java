package com.hrmdemo.service.accessscope;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.DataScope;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.security.CurrentAccount;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.http.HttpStatus;

/** Phạm vi truy cập (PRD Testing Decisions, item 6). */
class AccessScopeServiceTest {

    static final UUID ME = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final UUID SOMEONE_ELSE = UUID.fromString("00000000-0000-0000-0000-000000000002");

    final AccessScopeService service = new AccessScopeService();

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

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"EMPLOYEE", "LINE_MANAGER", "PROJECT_MANAGER"})
    void otherRolesSeeOnlySelfUntilScopeByOrgUnitAndProjectExists(Role role) {
        assertThat(service.scopeOf(ME, Set.of(role)).dataScope()).isEqualTo(DataScope.SELF);
    }

    @Test
    void anAccountWithSeveralRolesGetsTheWidestScope() {
        assertThat(service.scopeOf(ME, Set.of(Role.EMPLOYEE, Role.HR)).dataScope()).isEqualTo(DataScope.COMPANY);
        assertThat(service.scopeOf(ME, Set.of(Role.DIRECTOR, Role.LINE_MANAGER, Role.EMPLOYEE)).dataScope())
                .isEqualTo(DataScope.COMPANY);
        assertThat(service.scopeOf(ME, Set.of(Role.EMPLOYEE, Role.PROJECT_MANAGER)).dataScope())
                .isEqualTo(DataScope.SELF);
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
                .containsExactly(Permission.COMPANY_VIEW, Permission.COMPANY_EDIT, Permission.ACCOUNT_VIEW);
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
        assertThat(service.scopeOfRoleNames(ME, List.of("NOT_A_ROLE")).dataScope()).isEqualTo(DataScope.SELF);
    }

    @Test
    void requiringSomethingOutsideTheScopeIsForbidden() {
        AccessScope employee = service.scopeOf(ME, Set.of(Role.EMPLOYEE));

        assertThatCode(() -> employee.requireAccount(ME)).doesNotThrowAnyException();
        assertThatCode(() -> employee.require(Permission.COMPANY_VIEW)).doesNotThrowAnyException();
        assertForbidden(() -> employee.requireAccount(SOMEONE_ELSE));
        assertForbidden(() -> employee.require(Permission.COMPANY_EDIT));
    }

    private static void assertForbidden(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(ex.getCode()).isEqualTo("auth.forbidden");
        });
    }
}
