package com.hrmdemo.dto.auth;

/**
 * Returned by login and refresh. The refresh token is not in the body; it travels in the HttpOnly cookie.
 *
 * @param expiresIn lifetime of the access token in seconds
 */
public record AccessTokenResponse(String accessToken, String tokenType, long expiresIn) {

    public static AccessTokenResponse bearer(String accessToken, long expiresIn) {
        return new AccessTokenResponse(accessToken, "Bearer", expiresIn);
    }
}
