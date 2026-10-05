package com.hrmdemo.dto.accessscope;

import java.util.List;
import java.util.Set;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The role and permission matrix: what each role sees and may do in this company.
 *
 * @param customized  false when every role has exactly its default permissions
 * @param permissions every permission once, in display order
 * @param roles       every role, in a fixed order
 */
public record RoleMatrixResponse(boolean customized, List<PermissionInfo> permissions, List<RoleRule> roles) {

    /**
     * @param locked   {@code BASE} for a permission every Account has whatever its roles; it cannot be taken
     *                 away from a role. Otherwise null
     * @param requires the permission a role must also have to hold this one, or null
     */
    public record PermissionInfo(
            Permission permission,
            PermissionGroup group,
            @Schema(nullable = true, allowableValues = "BASE") String locked,
            @Schema(nullable = true) Permission requires) {
    }

    /**
     * @param role        role name, e.g. {@code LINE_MANAGER}
     * @param dataScope   how far an Account holding only this role sees; fixed per role
     * @param locked      {@code ADMIN_ALL} for the Admin role, which always has every permission. Otherwise null
     * @param permissions what an Account holding only this role may do
     */
    public record RoleRule(
            String role,
            DataScope dataScope,
            @Schema(nullable = true, allowableValues = "ADMIN_ALL") String locked,
            Set<Permission> permissions) {
    }
}
