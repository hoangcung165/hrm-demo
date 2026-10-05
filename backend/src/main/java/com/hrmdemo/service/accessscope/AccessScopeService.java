package com.hrmdemo.service.accessscope;

import java.util.Arrays;
import java.util.Collection;
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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Phạm vi truy cập (PRD deep module 6): from an Account and its roles to the data filter and feature permissions.
 * The rules per role are fixed here; the units a Line manager sees come from the org structure through
 * {@link ManagedOrgUnits}. Scope by Project comes with HRM-15: until then Project managers see only themselves.
 */
@Service
@RequiredArgsConstructor
public class AccessScopeService {

    private record Rule(DataScope dataScope, Set<Permission> permissions) {
    }

    /** What every signed-in Account may do, whatever its roles. */
    private static final Set<Permission> BASE_PERMISSIONS = Set.of(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW);

    private static final Map<Role, Rule> RULES = Map.of(
            Role.ADMIN, new Rule(DataScope.COMPANY,
                    Set.of(Permission.COMPANY_EDIT, Permission.ACCOUNT_LIST, Permission.ACCOUNT_EDIT,
                            Permission.ORG_VIEW, Permission.ORG_EDIT)),
            Role.HR, new Rule(DataScope.COMPANY, Set.of(Permission.ORG_VIEW, Permission.ORG_EDIT)),
            Role.DIRECTOR, new Rule(DataScope.COMPANY, Set.of(Permission.ORG_VIEW)),
            Role.ACCOUNTANT, new Rule(DataScope.COMPANY, Set.of()),
            Role.LINE_MANAGER, new Rule(DataScope.ORG_UNIT, Set.of()),
            Role.PROJECT_MANAGER, new Rule(DataScope.SELF, Set.of()),
            Role.EMPLOYEE, new Rule(DataScope.SELF, Set.of()));

    private final ManagedOrgUnits managedOrgUnits;

    /**
     * Several roles add up: the widest data scope and the union of permissions.
     *
     * @param employeeId the Employee the Account is linked to, or null
     */
    public AccessScope scopeOf(UUID accountId, UUID employeeId, Set<Role> roles) {
        DataScope dataScope = DataScope.SELF;
        Set<Permission> permissions = EnumSet.copyOf(BASE_PERMISSIONS);
        for (Role role : roles) {
            Rule rule = RULES.get(role);
            if (rule == null) {
                // A role without a rule gets the base scope only.
                continue;
            }
            if (rule.dataScope().compareTo(dataScope) > 0) {
                dataScope = rule.dataScope();
            }
            permissions.addAll(rule.permissions());
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
        Set<Role> roles = EnumSet.noneOf(Role.class);
        for (String name : roleNames) {
            for (Role role : Role.values()) {
                if (role.name().equals(name)) {
                    roles.add(role);
                }
            }
        }
        return scopeOf(accountId, employeeId, roles);
    }

    /** The widest data scope the given role names give, e.g. for a row of the Account list. */
    public DataScope widestDataScope(Collection<String> roleNames) {
        return scopeOfRoleNames(null, null, roleNames).dataScope();
    }

    public AccessScope scopeOf(CurrentAccount account) {
        return scopeOfRoleNames(account.id(), account.employeeId(), account.roles());
    }

    /** The rules of every role, for the role matrix screen. */
    public RoleMatrixResponse roleMatrix(CurrentAccount caller) {
        scopeOf(caller).require(Permission.ACCOUNT_LIST);
        List<PermissionInfo> permissions = Arrays.stream(Permission.values())
                .map(permission -> new PermissionInfo(permission, permission.group()))
                .toList();
        List<RoleRule> roles = Arrays.stream(Role.values())
                .map(role -> {
                    // No Account: only the rule of the role itself is asked for.
                    AccessScope scope = scopeOf(null, Set.of(role));
                    return new RoleRule(role.name(), scope.dataScope(), scope.permissions());
                })
                .toList();
        return new RoleMatrixResponse(permissions, roles);
    }
}
