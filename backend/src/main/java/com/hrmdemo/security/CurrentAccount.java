package com.hrmdemo.security;

import java.util.Set;
import java.util.UUID;

/**
 * The signed-in Account, read from the access JWT. Declare it as a controller method parameter.
 * Data scope is always derived from this, never from client parameters (ADR 0001).
 */
public record CurrentAccount(UUID id, Set<String> roles) {

    public boolean hasRole(String role) {
        return roles.contains(role);
    }
}
