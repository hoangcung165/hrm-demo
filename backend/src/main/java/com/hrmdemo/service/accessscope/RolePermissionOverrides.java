package com.hrmdemo.service.accessscope;

import java.util.List;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.entity.auth.Role;

/**
 * Where the Access scope reads a company's changes to the default permissions of its roles. A port, so the
 * rules in {@link AccessScopeService} stay free of storage and are tested without a database.
 */
@FunctionalInterface
public interface RolePermissionOverrides {

    /**
     * @param granted true: the role has the permission although its default does not give it;
     *                false: the role lacks it although its default gives it
     */
    record PermissionOverride(Role role, Permission permission, boolean granted) {
    }

    /** Every difference from the defaults in the current Legal entity; empty when nothing was customized. */
    List<PermissionOverride> all();
}
