package com.hrmdemo.security;

import java.util.Set;
import java.util.UUID;

/**
 * The signed-in Account, read from the access JWT. Declare it as a controller method parameter.
 * Data scope is always derived from this, never from client parameters (ADR 0001).
 *
 * @param employeeId the Employee the Account is linked to, or null
 */
public record CurrentAccount(UUID id, UUID employeeId, Set<String> roles) {

    /** An Account that is not linked to an Employee. */
    public CurrentAccount(UUID id, Set<String> roles) {
        this(id, null, roles);
    }

    public boolean hasRole(String role) {
        return roles.contains(role);
    }
}
