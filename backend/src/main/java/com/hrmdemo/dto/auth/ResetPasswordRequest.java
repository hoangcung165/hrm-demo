package com.hrmdemo.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank String token,
        @NotBlank @Size(min = PasswordPolicy.MIN_LENGTH, max = PasswordPolicy.MAX_LENGTH) String newPassword) {
}
