package com.hrmdemo.dto.accessscope;

import java.util.List;

import jakarta.validation.constraints.NotNull;

/**
 * New permissions of roles, saved together or not at all. A role that is left out keeps its permissions.
 *
 * @param roles one entry per role to change
 */
public record RolePermissionsRequest(@NotNull List<RoleEntry> roles) {

    /**
     * @param role        role name
     * @param permissions the complete list of the role's permissions; the base permissions every Account has
     *                    may be left out
     */
    public record RoleEntry(String role, List<String> permissions) {
    }
}
