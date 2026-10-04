package com.hrmdemo.service.accessscope;

import java.util.Collection;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.DataScope;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.security.CurrentAccount;
import org.springframework.stereotype.Service;

/**
 * Phạm vi truy cập (PRD deep module 6): from an Account and its roles to the data filter and feature permissions.
 * Pure rules, no database. Until HRM-04 adds scope by Organization unit and Project, Line managers and
 * Project managers see only themselves.
 */
@Service
public class AccessScopeService {

    private record Rule(DataScope dataScope, Set<Permission> permissions) {
    }

    /** What every signed-in Account may do, whatever its roles. */
    private static final Set<Permission> BASE_PERMISSIONS = Set.of(Permission.COMPANY_VIEW, Permission.ACCOUNT_VIEW);

    private static final Map<Role, Rule> RULES = Map.of(
            Role.ADMIN, new Rule(DataScope.COMPANY,
                    Set.of(Permission.COMPANY_EDIT, Permission.ORG_VIEW, Permission.ORG_EDIT)),
            Role.HR, new Rule(DataScope.COMPANY, Set.of(Permission.ORG_VIEW, Permission.ORG_EDIT)),
            Role.DIRECTOR, new Rule(DataScope.COMPANY, Set.of(Permission.ORG_VIEW)),
            Role.ACCOUNTANT, new Rule(DataScope.COMPANY, Set.of()),
            Role.LINE_MANAGER, new Rule(DataScope.SELF, Set.of()),
            Role.PROJECT_MANAGER, new Rule(DataScope.SELF, Set.of()),
            Role.EMPLOYEE, new Rule(DataScope.SELF, Set.of()));

    /** Several roles add up: the widest data scope and the union of permissions. */
    public AccessScope scopeOf(UUID accountId, Set<Role> roles) {
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
        return new AccessScope(accountId, dataScope, permissions);
    }

    /** Role names as stored in the access JWT; names that are not a {@link Role} are ignored. */
    public AccessScope scopeOfRoleNames(UUID accountId, Collection<String> roleNames) {
        Set<Role> roles = EnumSet.noneOf(Role.class);
        for (String name : roleNames) {
            for (Role role : Role.values()) {
                if (role.name().equals(name)) {
                    roles.add(role);
                }
            }
        }
        return scopeOf(accountId, roles);
    }

    public AccessScope scopeOf(CurrentAccount account) {
        return scopeOfRoleNames(account.id(), account.roles());
    }
}
