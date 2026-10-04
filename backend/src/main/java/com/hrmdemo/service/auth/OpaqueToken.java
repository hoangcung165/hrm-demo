package com.hrmdemo.service.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Random secrets handed to the client once (refresh tokens, password reset tokens).
 * Only the SHA-256 hash is stored, so a database leak does not expose usable tokens.
 */
final class OpaqueToken {

    private static final int BYTES = 32;
    private static final SecureRandom RANDOM = new SecureRandom();

    private OpaqueToken() {
    }

    static String generate() {
        byte[] bytes = new byte[BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** SHA-256 as 64 lowercase hex characters. */
    static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
