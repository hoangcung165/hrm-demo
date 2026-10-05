package com.hrmdemo.service.accessscope;

import java.util.ArrayList;
import java.util.List;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.entity.accessscope.RolePermissionOverride;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.repository.accessscope.RolePermissionOverrideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * The override rows of the current Legal entity, read with one small query each time the Access scope is
 * worked out. Not cached: a saved change then applies at the next request without anything to invalidate.
 */
@Component
@RequiredArgsConstructor
class StoredRolePermissionOverrides implements RolePermissionOverrides {

    private final RolePermissionOverrideRepository overrides;

    @Override
    @Transactional(readOnly = true)
    public List<PermissionOverride> all() {
        List<PermissionOverride> known = new ArrayList<>();
        for (RolePermissionOverride row : overrides.findAll()) {
            Role role = named(Role.values(), row.getRole());
            Permission permission = named(Permission.values(), row.getPermission());
            // A name from another release of the app: ignored, the row stays for the release that knows it.
            if (role != null && permission != null) {
                known.add(new PermissionOverride(role, permission, row.isGranted()));
            }
        }
        return known;
    }

    private static <E extends Enum<E>> E named(E[] constants, String name) {
        for (E constant : constants) {
            if (constant.name().equals(name)) {
                return constant;
            }
        }
        return null;
    }
}
