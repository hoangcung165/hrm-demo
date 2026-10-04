package com.hrmdemo.dto.auth;

/** Password rules shared by every request that sets a password. */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 8;

    /** BCrypt only reads the first 72 bytes, so longer passwords are rejected instead of silently cut. */
    public static final int MAX_LENGTH = 72;

    private PasswordPolicy() {
    }
}
