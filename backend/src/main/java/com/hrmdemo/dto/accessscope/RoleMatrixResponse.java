package com.hrmdemo.dto.accessscope;

import java.util.List;
import java.util.Set;

/**
 * The role and permission matrix: what each role sees and may do. Read-only, the rules live in code.
 *
 * @param permissions every permission once, in display order, with its group
 * @param roles       every role, in a fixed order
 */
public record RoleMatrixResponse(List<PermissionInfo> permissions, List<RoleRule> roles) {

    public record PermissionInfo(Permission permission, PermissionGroup group) {
    }

    /**
     * @param role        role name, e.g. {@code LINE_MANAGER}
     * @param dataScope   how far an Account holding only this role sees
     * @param permissions what an Account holding only this role may do
     */
    public record RoleRule(String role, DataScope dataScope, Set<Permission> permissions) {
    }
}
