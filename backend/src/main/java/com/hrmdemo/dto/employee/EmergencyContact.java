package com.hrmdemo.dto.employee;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Người liên hệ khẩn cấp of an Employee.
 *
 * @param name         at most 150 characters
 * @param relationship at most 50 characters, e.g. "Cha"
 * @param phone        Vietnamese mobile or landline number; spaces, dots and dashes are removed, +84 becomes 0
 */
public record EmergencyContact(
        @Schema(nullable = true) String name,
        @Schema(nullable = true) String relationship,
        @Schema(nullable = true) String phone) {
}
