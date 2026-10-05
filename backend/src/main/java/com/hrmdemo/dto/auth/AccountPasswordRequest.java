package com.hrmdemo.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** A new temporary password, set by an Admin for another Account. */
public record AccountPasswordRequest(
        @NotBlank @Size(min = PasswordPolicy.MIN_LENGTH, max = PasswordPolicy.MAX_LENGTH) String password) {
}
