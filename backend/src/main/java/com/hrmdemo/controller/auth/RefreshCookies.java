package com.hrmdemo.controller.auth;

import java.time.Duration;

import com.hrmdemo.dto.auth.AccessTokenResponse;
import com.hrmdemo.dto.auth.AuthSession;
import com.hrmdemo.security.AuthProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * The refresh cookie of a session (ADR 0001): HttpOnly, SameSite=Strict and scoped to {@code /api/auth}.
 * One place writes it, for every endpoint that starts or ends a session.
 */
@Component
@RequiredArgsConstructor
class RefreshCookies {

    static final String NAME = "refresh_token";
    static final String PATH = "/api/auth";

    private final AuthProperties properties;

    /** 200 with the access token in the body and the session's refresh token in the cookie. */
    ResponseEntity<AccessTokenResponse> started(AuthSession session) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie(session.refreshToken(), properties.refreshTokenTtl()))
                .body(session.accessToken());
    }

    /** The Set-Cookie value that makes the browser drop the cookie. */
    String cleared() {
        return cookie("", Duration.ZERO);
    }

    private String cookie(String value, Duration maxAge) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite("Strict")
                .path(PATH)
                .maxAge(maxAge)
                .build()
                .toString();
    }
}
