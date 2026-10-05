package com.hrmdemo.dto.auth;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.DataScope;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One Tài khoản (Account), as a list row and on its own.
 *
 * @param dataScope   the widest data scope of the Account's roles
 * @param employee    the linked Employee; always null until HRM-06
 * @param demoPersona persona key (the role name it stands for) of a demo persona Account, else null
 */
public record AccountResponse(
        UUID id,
        String email,
        String fullName,
        Set<String> roles,
        DataScope dataScope,
        @Schema(allowableValues = {"ACTIVE", "LOCKED"}) String status,
        @Schema(nullable = true) AccountEmployee employee,
        @Schema(nullable = true) String demoPersona,
        Instant createdAt) {
}
