package com.hrmdemo.dto.profileupdate;

import com.hrmdemo.dto.employee.ContactField;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One proposed change: "Trường / Hiện tại / Đề xuất" on the request detail.
 *
 * @param oldValue the profile's value when the request was sent (or sent again); null when empty
 * @param newValue the proposed value; null clears the field
 */
public record ProfileUpdateChange(ContactField field, @Schema(nullable = true) String oldValue,
        @Schema(nullable = true) String newValue) {
}
