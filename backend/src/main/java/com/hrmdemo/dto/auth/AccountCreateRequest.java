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
 * A new Tài khoản. The full name is trimmed and the email trimmed and lower-cased before validation.
 *
 * @param roles      at least one role name
 * @param password   a temporary password the Admin hands over; the person changes it after signing in
 * @param employeeId the Employee the Account belongs to, or null; nothing is accepted until HRM-06
 */
public record AccountCreateRequest(
        @NotBlank @Size(max = AccountText.FULL_NAME_MAX) String fullName,
        @NotBlank @Email @Size(max = AccountText.EMAIL_MAX) String email,
        @NotEmpty
        @ArraySchema(schema = @Schema(allowableValues = {"ADMIN", "HR", "LINE_MANAGER", "PROJECT_MANAGER",
                "ACCOUNTANT", "DIRECTOR", "EMPLOYEE"}))
        List<String> roles,
        @NotBlank @Size(min = PasswordPolicy.MIN_LENGTH, max = PasswordPolicy.MAX_LENGTH) String password,
        UUID employeeId) {

    public AccountCreateRequest {
        fullName = AccountText.trim(fullName);
        email = AccountText.email(email);
    }
}
