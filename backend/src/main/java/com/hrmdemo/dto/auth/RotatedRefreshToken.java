package com.hrmdemo.dto.auth;

import java.util.UUID;

/** A freshly rotated refresh token (raw value, shown once) and the Account it belongs to. */
public record RotatedRefreshToken(UUID accountId, String token) {
}
