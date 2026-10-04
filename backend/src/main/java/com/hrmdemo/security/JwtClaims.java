package com.hrmdemo.security;

/** Custom claim names in the access JWT. {@code sub} is the Account id. */
public final class JwtClaims {

    public static final String ROLES = "roles";

    private JwtClaims() {
    }
}
