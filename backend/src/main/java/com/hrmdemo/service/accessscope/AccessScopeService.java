package com.hrmdemo.service.accessscope;

import java.util.Arrays;
import java.util.Collection;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.DataScope;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.accessscope.RoleMatrixResponse;
import com.hrmdemo.dto.accessscope.RoleMatrixResponse.PermissionInfo;
import com.hrmdemo.dto.accessscope.RoleMatrixResponse.RoleRule;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.security.CurrentAccount;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Phạm vi truy cập (PRD deep module 6): from an Account and its roles to the data filter and feature permissions.
 * <p>
 * Per role the data scope is fixed here. The permissions have defaults here, and a company may change them
 * (role matrix screen): the differences come through {@link RolePermissionOverrides} and are read on every
 * call, so a saved change applies at the next request. The units a Line manager sees come from the org
 * structure through {@link ManagedOrgUnits}. Scope by Project comes with HRM-15: until then Project managers
 * see only themselves.
 */
@Service
public class AccessScopeService {

    private record Rule(DataScope dataScope, Set<Permission> permissions) {
    }

    /** What every signed-in Account may do, whatever its roles. No role can lose these. */
    private static final Set<Permission> BASE_PERMISSIONS = Set.of(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW);

    /** Data scope and default permissions per role. The Admin role is not editable: it always has everything. */
    private static final Map<Role, Rule> RULES = Map.of(
            Role.ADMIN, new Rule(DataScope.COMPANY, EnumSet.allOf(Permission.class)),
            Role.HR, new Rule(DataScope.COMPANY, Set.of(Permission.ORG_VIEW, Permission.ORG_EDIT,
                    Permission.EMPLOYEE_VIEW, Permission.EMPLOYEE_EDIT, Permission.EMPLOYEE_SENSITIVE_VIEW,
                    Permission.PROJECT_VIEW, Permission.RESOURCE_VIEW, Permission.LEAVE_POLICY_EDIT,
                    Permission.SHIFT_VIEW, Permission.SHIFT_EDIT, Permission.SHIFT_ASSIGN)),
            Role.DIRECTOR, new Rule(DataScope.COMPANY, Set.of(Permission.ORG_VIEW, Permission.EMPLOYEE_VIEW,
                    Permission.PROJECT_VIEW, Permission.PROJECT_EDIT, Permission.PROJECT_EDIT_ALL,
                    Permission.RESOURCE_VIEW, Permission.RESOURCE_EDIT, Permission.SHIFT_VIEW, Permission.AUDIT_VIEW)),
            // Payroll and insurance need the identity numbers.
            Role.ACCOUNTANT, new Rule(DataScope.COMPANY,
                    Set.of(Permission.EMPLOYEE_VIEW, Permission.EMPLOYEE_SENSITIVE_VIEW)),
            Role.LINE_MANAGER, new Rule(DataScope.ORG_UNIT, Set.of(Permission.EMPLOYEE_VIEW, Permission.PROJECT_VIEW,
                    Permission.SHIFT_VIEW, Permission.SHIFT_ASSIGN)),
            Role.PROJECT_MANAGER, new Rule(DataScope.SELF,
                    Set.of(Permission.PROJECT_VIEW, Permission.PROJECT_EDIT, Permission.RESOURCE_VIEW)),
            Role.EMPLOYEE, new Rule(DataScope.SELF, Set.of()));

    private final ManagedOrgUnits managedOrgUnits;
    private final RolePermissionOverrides overrides;

    @Autowired
    public AccessScopeService(ManagedOrgUnits managedOrgUnits, RolePermissionOverrides overrides) {
        this.managedOrgUnits = managedOrgUnits;
        this.overrides = overrides;
    }

    /** With the default permissions only: for code that works without stored role permissions (unit tests). */
    public AccessScopeService(ManagedOrgUnits managedOrgUnits) {
        this(managedOrgUnits, () -> List.of());
    }

    /** Whether every Account has the permission whatever its roles. */
    public static boolean isBase(Permission permission) {
        return BASE_PERMISSIONS.contains(permission);
    }

    /** What the role may do when the company has changed nothing, base permissions included. */
    public static Set<Permission> defaultPermissions(Role role) {
        Set<Permission> permissions = EnumSet.copyOf(BASE_PERMISSIONS);
        permissions.addAll(RULES.get(role).permissions());
        return permissions;
    }

    /** What each role may do in this company: the defaults with the company's changes applied. */
    public Map<Role, Set<Permission>> permissionsByRole() {
        Map<Role, Set<Permission>> byRole = new EnumMap<>(Role.class);
        for (Role role : Role.values()) {
            byRole.put(role, defaultPermissions(role));
        }
        for (RolePermissionOverrides.PermissionOverride override : overrides.all()) {
            // The Admin role and the base permissions are locked: a row about them changes nothing.
            if (override.role() == Role.ADMIN || isBase(override.permission())) {
                continue;
            }
            if (override.granted()) {
                byRole.get(override.role()).add(override.permission());
            } else {
                byRole.get(override.role()).remove(override.permission());
            }
        }
        return byRole;
    }

    /**
     * Several roles add up: the widest data scope and the union of permissions.
     *
     * @param employeeId the Employee the Account is linked to, or null
     */
    public AccessScope scopeOf(UUID accountId, UUID employeeId, Set<Role> roles) {
        DataScope dataScope = widest(roles);
        Set<Permission> permissions = EnumSet.copyOf(BASE_PERMISSIONS);
        if (!roles.isEmpty()) {
            Map<Role, Set<Permission>> byRole = permissionsByRole();
            roles.forEach(role -> permissions.addAll(byRole.get(role)));
        }
        // Only the unit scope needs the units: company scope covers them all, self scope none.
        Set<UUID> orgUnitIds = dataScope == DataScope.ORG_UNIT && employeeId != null
                ? managedOrgUnits.unitIdsManagedBy(employeeId)
                : Set.of();
        return new AccessScope(accountId, employeeId, dataScope, orgUnitIds, permissions);
    }

    /** The scope of an Account that is not linked to an Employee. */
    public AccessScope scopeOf(UUID accountId, Set<Role> roles) {
        return scopeOf(accountId, null, roles);
    }

    /** Role names as stored in the access JWT; names that are not a {@link Role} are ignored. */
    public AccessScope scopeOfRoleNames(UUID accountId, UUID employeeId, Collection<String> roleNames) {
        return scopeOf(accountId, employeeId, roles(roleNames));
    }

    /**
     * The widest data scope the given role names give, e.g. for a row of the Account list. Data scopes are
     * fixed per role, so this reads nothing.
     */
    public DataScope widestDataScope(Collection<String> roleNames) {
        return widest(roles(roleNames));
    }

    public AccessScope scopeOf(CurrentAccount account) {
        return scopeOfRoleNames(account.id(), account.employeeId(), account.roles());
    }

    /** What every role sees and may do in this company, for the role matrix screen. */
    public RoleMatrixResponse roleMatrix(CurrentAccount caller) {
        scopeOf(caller).require(Permission.ACCOUNT_LIST);
        Map<Role, Set<Permission>> byRole = permissionsByRole();
        List<PermissionInfo> permissions = Arrays.stream(Permission.values())
                .map(permission -> new PermissionInfo(permission, permission.group(),
                        isBase(permission) ? "BASE" : null, permission.requires()))
                .toList();
        List<RoleRule> roles = Arrays.stream(Role.values())
                .map(role -> new RoleRule(role.name(), RULES.get(role).dataScope(),
                        role == Role.ADMIN ? "ADMIN_ALL" : null, byRole.get(role)))
                .toList();
        boolean customized = Arrays.stream(Role.values())
                .anyMatch(role -> !byRole.get(role).equals(defaultPermissions(role)));
        return new RoleMatrixResponse(customized, permissions, roles);
    }

    private static DataScope widest(Set<Role> roles) {
        DataScope dataScope = DataScope.SELF;
        for (Role role : roles) {
            if (RULES.get(role).dataScope().compareTo(dataScope) > 0) {
                dataScope = RULES.get(role).dataScope();
            }
        }
        return dataScope;
    }

    private static Set<Role> roles(Collection<String> roleNames) {
        Set<Role> roles = EnumSet.noneOf(Role.class);
        for (String name : roleNames) {
            for (Role role : Role.values()) {
                if (role.name().equals(name)) {
                    roles.add(role);
                }
            }
        }
        return roles;
    }
}
