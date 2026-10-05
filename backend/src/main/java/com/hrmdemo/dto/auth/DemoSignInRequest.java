package com.hrmdemo.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/** @param persona key of the demo persona to sign in as: the name of the role it stands for */
public record DemoSignInRequest(
        @NotBlank
        @Schema(allowableValues = {"ADMIN", "HR", "LINE_MANAGER", "PROJECT_MANAGER", "ACCOUNTANT", "DIRECTOR",
                "EMPLOYEE"})
        String persona) {
}
