package com.hrmdemo.service.accessscope;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.entity.accessscope.RolePermissionOverride;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.repository.accessscope.RolePermissionOverrideRepository;
import com.hrmdemo.service.accessscope.RolePermissionOverrides.PermissionOverride;
import org.junit.jupiter.api.Test;

/** Reading a company's stored changes to the role permissions. */
class StoredRolePermissionOverridesTest {

    final RolePermissionOverrideRepository repository = mock(RolePermissionOverrideRepository.class);
    final StoredRolePermissionOverrides stored = new StoredRolePermissionOverrides(repository);

    @Test
    void theRowsBecomeChangesToARolesPermissions() {
        when(repository.findAll()).thenReturn(List.of(
                new RolePermissionOverride("HR", "ACCOUNT_LIST", true),
                new RolePermissionOverride("HR", "ORG_EDIT", false)));

        assertThat(stored.all()).containsExactly(
                new PermissionOverride(Role.HR, Permission.ACCOUNT_LIST, true),
                new PermissionOverride(Role.HR, Permission.ORG_EDIT, false));
    }

    @Test
    void aRowWhoseRoleOrPermissionThisReleaseDoesNotKnowIsIgnored() {
        when(repository.findAll()).thenReturn(List.of(
                new RolePermissionOverride("HR", "PAYROLL_APPROVE", true),
                new RolePermissionOverride("AUDITOR", "ORG_VIEW", true),
                new RolePermissionOverride("DIRECTOR", "ACCOUNT_LIST", true)));

        assertThat(stored.all()).containsExactly(new PermissionOverride(Role.DIRECTOR, Permission.ACCOUNT_LIST, true));
    }

    @Test
    void aCompanyThatChangedNothingHasNoChanges() {
        when(repository.findAll()).thenReturn(List.of());

        assertThat(stored.all()).isEmpty();
    }
}
