package com.hrmdemo.service.accessscope;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.accessscope.RoleMatrixResponse;
import com.hrmdemo.dto.accessscope.RolePermissionsRequest;
import com.hrmdemo.dto.accessscope.RolePermissionsRequest.RoleEntry;
import com.hrmdemo.entity.accessscope.RolePermissionOverride;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.accessscope.RolePermissionOverrideRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.legalentity.LegalEntityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * The rules for editing role permissions, in business terms. The stored rows are a plain list behind the
 * mocked repository, and the real Access scope rules read that same list.
 */
@ExtendWith(MockitoExtension.class)
class RolePermissionServiceTest {

    static final CurrentAccount ADMIN = new CurrentAccount(UUID.randomUUID(), Set.of("ADMIN"));

    @Mock
    RolePermissionOverrideRepository repository;
    @Mock
    LegalEntityService legalEntityService;

    /** What the repository holds. */
    final List<RolePermissionOverride> stored = new ArrayList<>();

    RolePermissionService service;

    @BeforeEach
    void setUp() {
        lenient().when(repository.findAll()).thenAnswer(call -> new ArrayList<>(stored));
        lenient().doAnswer(call -> {
            Iterable<RolePermissionOverride> rows = call.getArgument(0);
            rows.forEach(stored::remove);
            return null;
        }).when(repository).deleteAll(anyIterable());
        lenient().when(repository.saveAll(anyIterable())).thenAnswer(call -> {
            Iterable<RolePermissionOverride> rows = call.getArgument(0);
            rows.forEach(stored::add);
            return new ArrayList<>(stored);
        });
        AccessScopeService accessScopes = new AccessScopeService(employeeId -> Set.of(),
                new StoredRolePermissionOverrides(repository));
        service = new RolePermissionService(repository, accessScopes, legalEntityService);
    }

    // --- save ---

    @Test
    void aRoleIsGivenAPermissionAndLosesAnother() {
        RoleMatrixResponse matrix = service.update(ADMIN, request(entry("HR", "ACCOUNT_LIST", "ORG_VIEW",
                "EMPLOYEE_VIEW", "EMPLOYEE_EDIT", "EMPLOYEE_SENSITIVE_VIEW", "PROJECT_VIEW", "RESOURCE_VIEW", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT")));

        assertThat(permissions(matrix, "HR")).containsExactly(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW,
                Permission.ACCOUNT_LIST, Permission.ORG_VIEW, Permission.EMPLOYEE_VIEW, Permission.EMPLOYEE_EDIT,
                Permission.EMPLOYEE_SENSITIVE_VIEW, Permission.PROJECT_VIEW, Permission.RESOURCE_VIEW,
                Permission.LEAVE_POLICY_EDIT, Permission.SHIFT_VIEW, Permission.SHIFT_EDIT, Permission.SHIFT_ASSIGN,
                Permission.ATTENDANCE_VIEW, Permission.ATTENDANCE_IMPORT);
        assertThat(matrix.customized()).isTrue();
        // Stored as differences from the defaults: one permission added, one taken away.
        assertThat(rows()).containsExactlyInAnyOrder("HR ACCOUNT_LIST true", "HR ORG_EDIT false");
    }

    @Test
    void theCompanyWideLockIsTakenBeforeTheStoredRowsAreReplaced() {
        service.update(ADMIN, request(entry("HR", "ORG_VIEW")));

        InOrder order = inOrder(legalEntityService, repository);
        order.verify(legalEntityService).lockForStructureChange();
        order.verify(repository).deleteAll(anyIterable());
        order.verify(repository).flush();
        order.verify(repository).saveAll(anyIterable());
    }

    @Test
    void aRoleThatIsLeftOutKeepsItsPermissions() {
        service.update(ADMIN, request(entry("DIRECTOR", "ORG_VIEW", "ACCOUNT_LIST", "EMPLOYEE_VIEW", "PROJECT_VIEW",
                "PROJECT_EDIT", "PROJECT_EDIT_ALL", "RESOURCE_VIEW", "RESOURCE_EDIT", "SHIFT_VIEW", "ATTENDANCE_VIEW", "AUDIT_VIEW")));

        RoleMatrixResponse matrix = service.update(ADMIN, request(entry("HR", "ORG_VIEW", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT", "EMPLOYEE_SENSITIVE_VIEW",
                "PROJECT_VIEW", "RESOURCE_VIEW", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT")));

        assertThat(permissions(matrix, "DIRECTOR")).contains(Permission.ACCOUNT_LIST);
        assertThat(permissions(matrix, "HR")).doesNotContain(Permission.ORG_EDIT);
        assertThat(rows()).containsExactlyInAnyOrder("DIRECTOR ACCOUNT_LIST true", "HR ORG_EDIT false");
    }

    @Test
    void theBasePermissionsAreImpliedWhetherTheyAreListedOrNot() {
        RoleMatrixResponse without = service.update(ADMIN, request(entry("EMPLOYEE")));
        assertThat(permissions(without, "EMPLOYEE")).containsExactly(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW);

        RoleMatrixResponse with = service.update(ADMIN, request(entry("EMPLOYEE", "COMPANY_VIEW", "ACCOUNT_VIEW")));
        assertThat(permissions(with, "EMPLOYEE")).containsExactly(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW);

        // Either way the role is at its defaults, so nothing is stored.
        assertThat(with.customized()).isFalse();
        assertThat(stored).isEmpty();
    }

    @Test
    void savingARolesDefaultsRemovesItsCustomization() {
        service.update(ADMIN, request(entry("HR", "ORG_VIEW")));
        assertThat(stored).isNotEmpty();

        RoleMatrixResponse matrix = service.update(ADMIN, request(entry("HR", "ORG_VIEW", "ORG_EDIT", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT", "EMPLOYEE_SENSITIVE_VIEW",
                "PROJECT_VIEW", "RESOURCE_VIEW", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT")));

        assertThat(matrix.customized()).isFalse();
        assertThat(stored).isEmpty();
    }

    @Test
    void theAdminRoleAlwaysHasEveryPermission() {
        assertRefused("role_permission.role_locked", Map.of("role", "ADMIN"),
                request(entry("ADMIN", "COMPANY_EDIT", "ACCOUNT_LIST", "ACCOUNT_EDIT", "ORG_VIEW")));
        assertRefused("role_permission.role_locked", Map.of("role", "ADMIN"), request(entry("ADMIN")));

        // Listing it unchanged is accepted; the base permissions may be left out as for any role.
        RoleMatrixResponse matrix = service.update(ADMIN, request(
                entry("ADMIN", "COMPANY_EDIT", "ACCOUNT_LIST", "ACCOUNT_EDIT", "ORG_VIEW", "ORG_EDIT",
                        "EMPLOYEE_VIEW", "EMPLOYEE_EDIT", "EMPLOYEE_SENSITIVE_VIEW", "CATALOG_EDIT",
                        "APPROVAL_FLOW_EDIT", "PROJECT_VIEW", "PROJECT_EDIT", "PROJECT_EDIT_ALL", "RESOURCE_VIEW", "RESOURCE_EDIT", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT", "AUDIT_VIEW")));
        assertThat(permissions(matrix, "ADMIN")).containsExactly(Permission.values());
        assertThat(stored).isEmpty();
    }

    @Test
    void anEditPermissionNeedsItsViewPermission() {
        assertRefused("role_permission.dependency_missing",
                Map.of("role", "DIRECTOR", "permission", "ORG_EDIT", "requires", "ORG_VIEW"),
                request(entry("DIRECTOR", "ORG_EDIT")));
        assertRefused("role_permission.dependency_missing",
                Map.of("role", "HR", "permission", "ACCOUNT_EDIT", "requires", "ACCOUNT_LIST"),
                request(entry("HR", "ACCOUNT_EDIT", "ORG_VIEW", "ORG_EDIT")));
    }

    @Test
    void theEmployeePermissionsNeedTheEmployeeView() {
        assertRefused("role_permission.dependency_missing",
                Map.of("role", "DIRECTOR", "permission", "EMPLOYEE_EDIT", "requires", "EMPLOYEE_VIEW"),
                request(entry("DIRECTOR", "ORG_VIEW", "EMPLOYEE_EDIT")));
        assertRefused("role_permission.dependency_missing",
                Map.of("role", "ACCOUNTANT", "permission", "EMPLOYEE_SENSITIVE_VIEW", "requires", "EMPLOYEE_VIEW"),
                request(entry("ACCOUNTANT", "EMPLOYEE_SENSITIVE_VIEW")));
    }

    @Test
    void aViewPermissionCannotBeRemovedWhileItsEditPermissionStays() {
        // HR has ORG_VIEW and ORG_EDIT by default; this list drops the view and keeps the edit.
        assertRefused("role_permission.dependency_missing",
                Map.of("role", "HR", "permission", "ORG_EDIT", "requires", "ORG_VIEW"),
                request(entry("HR", "ORG_EDIT")));
    }

    @Test
    void editingCompanyInfoNeedsNoExtraTickBecauseItsViewIsABasePermission() {
        RoleMatrixResponse matrix = service.update(ADMIN, request(entry("ACCOUNTANT", "COMPANY_EDIT")));

        assertThat(permissions(matrix, "ACCOUNTANT")).containsExactly(Permission.COMPANY_VIEW,
                Permission.COMPANY_EDIT, Permission.ACCOUNT_VIEW);
    }

    @Test
    void oneRefusedRoleRefusesTheWholeRequest() {
        service.update(ADMIN, request(entry("EMPLOYEE", "ORG_VIEW")));

        assertRefused("role_permission.dependency_missing",
                Map.of("role", "HR", "permission", "ORG_EDIT", "requires", "ORG_VIEW"),
                request(entry("DIRECTOR", "ORG_VIEW", "ACCOUNT_LIST"), entry("HR", "ORG_EDIT")));

        // The valid first entry was not saved, and what was there before is still there.
        assertThat(rows()).containsExactly("EMPLOYEE ORG_VIEW true");
    }

    @Test
    void anUnknownOrRepeatedRoleAndAnUnknownOrMissingPermissionListAreInvalid() {
        assertInvalid("roles[0].role", request(entry("BOSS", "ORG_VIEW")));
        assertInvalid("roles[0].role", request(new RoleEntry(null, List.of("ORG_VIEW"))));
        assertInvalid("roles[1].role", request(entry("HR", "ORG_VIEW"), entry("HR", "ORG_VIEW")));
        assertInvalid("roles[1].role", request(entry("HR", "ORG_VIEW"), null));
        assertInvalid("roles[0].permissions", request(entry("HR", "ORG_VIEW", "PAYROLL_APPROVE")));
        assertInvalid("roles[1].permissions", request(entry("HR", "ORG_VIEW"), new RoleEntry("DIRECTOR", null)));
        assertThat(stored).isEmpty();
    }

    @Test
    void anEmptyRequestChangesNothing() {
        service.update(ADMIN, request(entry("HR", "ORG_VIEW", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT", "EMPLOYEE_SENSITIVE_VIEW",
                "PROJECT_VIEW", "RESOURCE_VIEW", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT")));

        RoleMatrixResponse matrix = service.update(ADMIN, new RolePermissionsRequest(List.of()));

        assertThat(matrix.customized()).isTrue();
        assertThat(rows()).containsExactly("HR ORG_EDIT false");
    }

    // --- reset ---

    @Test
    void resetPutsEveryRoleBackToItsDefaults() {
        service.update(ADMIN, request(entry("HR", "ACCOUNT_LIST", "ORG_VIEW"), entry("EMPLOYEE", "ORG_VIEW")));

        RoleMatrixResponse matrix = service.reset(ADMIN);

        assertThat(matrix.customized()).isFalse();
        assertThat(stored).isEmpty();
        for (Role role : Role.values()) {
            assertThat(permissions(matrix, role.name())).as(role.name())
                    .isEqualTo(AccessScopeService.defaultPermissions(role));
        }
        // Resetting again is fine.
        assertThat(service.reset(ADMIN).customized()).isFalse();
    }

    // --- who may ---

    @ParameterizedTest
    @EnumSource(value = Role.class, names = "ADMIN", mode = EnumSource.Mode.EXCLUDE)
    void byDefaultOnlyTheAdminMayChangeOrResetRolePermissions(Role role) {
        CurrentAccount caller = new CurrentAccount(UUID.randomUUID(), Set.of(role.name()));

        assertForbidden(() -> service.update(caller, request(entry("HR", "ORG_VIEW"))));
        assertForbidden(() -> service.reset(caller));

        verifyNoInteractions(legalEntityService);
        assertThat(stored).isEmpty();
    }

    @Test
    void aRoleThatWasGivenThePermissionToEditAccountsMayChangeRolePermissionsToo() {
        service.update(ADMIN, request(entry("HR", "ACCOUNT_LIST", "ACCOUNT_EDIT", "ORG_VIEW", "ORG_EDIT")));
        CurrentAccount hr = new CurrentAccount(UUID.randomUUID(), Set.of("HR"));

        RoleMatrixResponse matrix = service.update(hr, request(entry("DIRECTOR", "ORG_VIEW", "ACCOUNT_LIST")));

        assertThat(permissions(matrix, "DIRECTOR")).contains(Permission.ACCOUNT_LIST);
    }

    // --- helpers ---

    private static RolePermissionsRequest request(RoleEntry... entries) {
        // Arrays.asList, not List.of: a null entry is one of the invalid cases.
        return new RolePermissionsRequest(Arrays.asList(entries));
    }

    private static RoleEntry entry(String role, String... permissions) {
        return new RoleEntry(role, List.of(permissions));
    }

    private static Set<Permission> permissions(RoleMatrixResponse matrix, String role) {
        return matrix.roles().stream().filter(rule -> rule.role().equals(role)).findFirst().orElseThrow()
                .permissions();
    }

    /** The stored rows as "ROLE PERMISSION granted". */
    private List<String> rows() {
        return stored.stream()
                .map(row -> row.getRole() + " " + row.getPermission() + " " + row.isGranted())
                .toList();
    }

    private void assertRefused(String code, Map<String, Object> properties, RolePermissionsRequest request) {
        List<String> before = rows();
        assertThatThrownBy(() -> service.update(ADMIN, request))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus().value()).isEqualTo(409);
                    assertThat(ex.getCode()).isEqualTo(code);
                    assertThat(ex.getProperties()).isEqualTo(properties);
                });
        assertThat(rows()).as("nothing was stored").isEqualTo(before);
    }

    private void assertInvalid(String field, RolePermissionsRequest request) {
        assertThatThrownBy(() -> service.update(ADMIN, request))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus().value()).isEqualTo(400);
                    assertThat(ex.getCode()).isEqualTo("validation.invalid");
                    assertThat(ex.getProperties().get("errors"))
                            .isEqualTo(List.of(Map.of("field", field, "code", "Invalid")));
                });
    }

    private static void assertForbidden(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getStatus().value()).isEqualTo(403);
            assertThat(ex.getCode()).isEqualTo("auth.forbidden");
        });
    }
}
