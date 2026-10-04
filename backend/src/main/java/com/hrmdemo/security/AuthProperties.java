package com.hrmdemo.security;

import java.time.Duration;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * Authentication settings ({@code hrm.auth.*}).
 *
 * @param jwtSecret       HS256 signing key, at least 32 characters ({@code HRM_JWT_SECRET})
 * @param accessTokenTtl  lifetime of the access JWT
 * @param refreshTokenTtl lifetime of a refresh token and its cookie
 * @param cookieSecure    whether the refresh cookie is marked Secure (turn off only for plain-HTTP local runs)
 */
@Validated
@ConfigurationProperties(prefix = "hrm.auth")
public record AuthProperties(
        @NotBlank @Size(min = 32) String jwtSecret,
        @NotNull @DefaultValue("15m") Duration accessTokenTtl,
        @NotNull @DefaultValue("7d") Duration refreshTokenTtl,
        @DefaultValue("true") boolean cookieSecure) {
}
