package com.hrmdemo.dto.profileupdate;

import com.hrmdemo.dto.employee.EmergencyContact;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

/**
 * The caller's contact fields as they want them, all of them (like the "Cá nhân" form): the fields that differ
 * from the profile become the request. Checked with the profile rules; field errors use the profile paths
 * ({@code personal.phone}, {@code personal.emergencyContact.phone}, ...).
 *
 * @param note optional, for the approvers; at most 500 characters
 */
public record ProfileUpdateSubmitRequest(
        @Schema(nullable = true) String personalEmail,
        @Schema(nullable = true) String phone,
        @Schema(nullable = true) String address,
        @Schema(nullable = true) EmergencyContact emergencyContact,
        @Schema(nullable = true) @Size(max = 500) String note) {
}
