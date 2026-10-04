package com.hrmdemo.service.accessscope;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.DataScope;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Phạm vi truy cập (Access scope) of one Account: which records it may see and which features it may use.
 * Services ask this value instead of checking roles themselves.
 * HRM-04 extends it with the managed Organization units and Projects; callers keep using the
 * {@code covers...} / {@code require...} methods.
 *
 * @param accountId   the Account the scope belongs to
 * @param dataScope   how far the Account sees
 * @param permissions features the Account may use
 */
public record AccessScope(UUID accountId, DataScope dataScope, Set<Permission> permissions) {

    public AccessScope {
        // EnumSet keeps the declaration order, so the API lists permissions in a stable order.
        Set<Permission> copy = EnumSet.noneOf(Permission.class);
        copy.addAll(permissions);
        permissions = Collections.unmodifiableSet(copy);
    }

    public boolean has(Permission permission) {
        return permissions.contains(permission);
    }

    /** Whether the Account may see the records of the given Account: always its own, others with company scope. */
    public boolean coversAccount(UUID otherAccountId) {
        return dataScope == DataScope.COMPANY || accountId.equals(otherAccountId);
    }

    public void require(Permission permission) {
        if (!has(permission)) {
            throw forbidden();
        }
    }

    public void requireAccount(UUID otherAccountId) {
        if (!coversAccount(otherAccountId)) {
            throw forbidden();
        }
    }

    private static ApiException forbidden() {
        // Same code as Spring Security's access-denied response (ProblemJsonSecurityHandler).
        return new ApiException(HttpStatus.FORBIDDEN, "auth.forbidden", "Access is denied");
    }
}
