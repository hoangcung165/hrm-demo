package com.hrmdemo.dto.attendance;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The rules of mobile check-in in force. Only the maximum accuracy can be changed; the rest is fixed by the decisions
 * of HRM-39 and listed so the settings page can show them.
 *
 * @param maxAccuracyMeters a mobile Lần quẹt reported less precise than this is marked Sai số lớn
 * @param defaultMaxAccuracyMeters the value used while the company has not saved its own
 * @param customized false when the company never saved its own
 * @param updatedAt when the company's own were saved; null for the defaults
 * @param updatedByName full name of the Account that saved them; null for the defaults or a deleted Account
 * @param everyEmployee every Employee may check in from the phone
 * @param photoRequired every mobile check-in takes a photo
 */
public record MobileCheckinSettingsResponse(int maxAccuracyMeters, int defaultMaxAccuracyMeters, boolean customized,
        @Schema(nullable = true) Instant updatedAt, @Schema(nullable = true) String updatedByName,
        boolean everyEmployee, boolean photoRequired) {
}
