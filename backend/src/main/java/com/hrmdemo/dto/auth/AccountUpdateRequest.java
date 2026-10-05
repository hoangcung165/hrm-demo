package com.hrmdemo.dto.auth;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/**
 * Edits a Tài khoản: its full name, email, roles and Employee. The status and the password have their own
 * operations. The full name is trimmed and the email trimmed and lower-cased before validation.
 *
 * @param roles      the complete new set of roles, at least one
 * @param employeeId the Employee the Account belongs to, or null; nothing is accepted until HRM-06
 */
public record AccountUpdateRequest(
        @NotBlank @Size(max = AccountText.FULL_NAME_MAX) String fullName,
        @NotBlank @Email @Size(max = AccountText.EMAIL_MAX) String email,
        @NotEmpty
        @ArraySchema(schema = @Schema(allowableValues = {"ADMIN", "HR", "LINE_MANAGER", "PROJECT_MANAGER",
                "ACCOUNTANT", "DIRECTOR", "EMPLOYEE"}))
        List<String> roles,
        UUID employeeId) {

    public AccountUpdateRequest {
        fullName = AccountText.trim(fullName);
        email = AccountText.email(email);
    }
}
