package com.hrmdemo.dto.auth;

import java.util.Set;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

public record AccountResponse(
        UUID id,
        String email,
        Set<String> roles,
        @Schema(allowableValues = {"ACTIVE", "LOCKED"}) String status) {
}
