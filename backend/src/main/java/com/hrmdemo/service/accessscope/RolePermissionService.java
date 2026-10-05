package com.hrmdemo.service.accessscope;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;

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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Editing what each role may do in this company (role matrix screen). The defaults, the fixed data scopes
 * and the reading side are in {@link AccessScopeService}; this class checks a change and stores it as
 * differences from the defaults.
 * <p>
 * Rules: the Admin role always has every permission; no role loses a base permission (they are implied);
 * a role cannot hold a permission without the one it requires. A request is saved whole or not at all, under
 * the company-wide lock, so two Admins saving at once apply one after the other.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RolePermissionService {

    private final RolePermissionOverrideRepository overrides;
    private final AccessScopeService accessScopes;
    private final LegalEntityService legalEntityService;

    /** Replaces the permissions of the listed roles; a role that is left out keeps its own. */
    @Transactional
    public RoleMatrixResponse update(CurrentAccount caller, RolePermissionsRequest request) {
        accessScopes.scopeOf(caller).require(Permission.ACCOUNT_EDIT);
        legalEntityService.lockForStructureChange();
        Map<Role, Set<Permission>> before = accessScopes.permissionsByRole();
        Map<Role, Set<Permission>> after = new EnumMap<>(before);
        Set<Role> listed = EnumSet.noneOf(Role.class);
        // Every entry is checked before anything is stored: one refused entry refuses the request.
        for (int i = 0; i < request.roles().size(); i++) {
            RoleEntry entry = request.roles().get(i);
            Role role = entry == null ? null : named(Role.values(), entry.role());
            if (role == null || !listed.add(role)) {
                throw invalid("roles[" + i + "].role");
            }
            Set<Permission> permissions = permissions(entry.permissions(), "roles[" + i + "].permissions");
            if (role == Role.ADMIN && !permissions.equals(EnumSet.allOf(Permission.class))) {
                throw new ApiException(HttpStatus.CONFLICT, "role_permission.role_locked",
                        "The Admin role always has every permission").with("role", role.name());
            }
            requireDependencies(role, permissions);
            after.put(role, permissions);
        }
        store(after);
        logChanges(caller, before, after);
        return accessScopes.roleMatrix(caller);
    }

    /** Every role back to its default permissions. */
    @Transactional
    public RoleMatrixResponse reset(CurrentAccount caller) {
        accessScopes.scopeOf(caller).require(Permission.ACCOUNT_EDIT);
        legalEntityService.lockForStructureChange();
        removeAll();
        log.info("Role permissions reset to the defaults by Account {}", caller.id());
        return accessScopes.roleMatrix(caller);
    }

    /** The listed permissions plus the base ones, which every role has whether they are listed or not. */
    private static Set<Permission> permissions(List<String> names, String field) {
        if (names == null) {
            throw invalid(field);
        }
        Set<Permission> permissions = EnumSet.noneOf(Permission.class);
        for (String name : names) {
            Permission permission = named(Permission.values(), name);
            if (permission == null) {
                throw invalid(field);
            }
            permissions.add(permission);
        }
        for (Permission permission : Permission.values()) {
            if (AccessScopeService.isBase(permission)) {
                permissions.add(permission);
            }
        }
        return permissions;
    }

    private static void requireDependencies(Role role, Set<Permission> permissions) {
        for (Permission permission : permissions) {
            Permission required = permission.requires();
            if (required != null && !permissions.contains(required)) {
                throw new ApiException(HttpStatus.CONFLICT, "role_permission.dependency_missing",
                        permission + " needs " + required)
                        .with("role", role.name())
                        .with("permission", permission.name())
                        .with("requires", required.name());
            }
        }
    }

    /** Stores what differs from the defaults and nothing else, so a role at its defaults has no row. */
    private void store(Map<Role, Set<Permission>> permissionsByRole) {
        List<RolePermissionOverride> rows = new ArrayList<>();
        for (Role role : Role.values()) {
            Set<Permission> defaults = AccessScopeService.defaultPermissions(role);
            for (Permission permission : Permission.values()) {
                boolean granted = permissionsByRole.get(role).contains(permission);
                // The Admin role and the base permissions are never stored: they cannot differ.
                if (role != Role.ADMIN && !AccessScopeService.isBase(permission)
                        && granted != defaults.contains(permission)) {
                    rows.add(new RolePermissionOverride(role.name(), permission.name(), granted));
                }
            }
        }
        removeAll();
        overrides.saveAll(rows);
    }

    /** Row by row and flushed, so the rows that replace them do not meet the unique key of the old ones. */
    private void removeAll() {
        overrides.deleteAll(overrides.findAll());
        overrides.flush();
    }

    private static void logChanges(CurrentAccount caller, Map<Role, Set<Permission>> before,
            Map<Role, Set<Permission>> after) {
        StringJoiner changes = new StringJoiner("; ");
        for (Role role : Role.values()) {
            Set<Permission> added = EnumSet.copyOf(after.get(role));
            added.removeAll(before.get(role));
            Set<Permission> removed = EnumSet.copyOf(before.get(role));
            removed.removeAll(after.get(role));
            if (!added.isEmpty() || !removed.isEmpty()) {
                changes.add(role + " added " + added + " removed " + removed);
            }
        }
        log.info("Role permissions saved by Account {}: {}", caller.id(),
                changes.length() == 0 ? "no change" : changes);
    }

    private static <E extends Enum<E>> E named(E[] constants, String name) {
        for (E constant : constants) {
            if (constant.name().equals(name)) {
                return constant;
            }
        }
        return null;
    }

    /** Same shape as a failed body validation: {@code validation.invalid} with the field. */
    private static ApiException invalid(String field) {
        return new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request value is invalid: " + field)
                .with("errors", List.of(Map.of("field", field, "code", "Invalid")));
    }
}
