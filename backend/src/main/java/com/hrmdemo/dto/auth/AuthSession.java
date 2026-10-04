package com.hrmdemo.dto.auth;

/** Result of login or refresh inside the backend: the response body plus the raw refresh token for the cookie. */
public record AuthSession(AccessTokenResponse accessToken, String refreshToken) {
}
