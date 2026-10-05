package com.hrmdemo.security;

/** Custom claim names in the access JWT. {@code sub} is the Account id. */
public final class JwtClaims {

    public static final String ROLES = "roles";

    /** Id of the Employee the Account is linked to; absent when there is none. */
    public static final String EMPLOYEE_ID = "employee_id";

    private JwtClaims() {
    }
}
