package com.hrmdemo.dto.resource;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The thresholds in force.
 *
 * @param customized    false when the company never saved its own (or restored the defaults)
 * @param updatedAt     when the company's own were saved; null when they are the defaults
 * @param updatedByName full name of the Account that saved them; null for the defaults or a deleted Account
 * @param canEdit       whether the caller may save new thresholds
 */
public record ResourceSettingsResponse(int benchPercent, int nearFullPercent, int endingWeeks, boolean customized,
        @Schema(nullable = true) Instant updatedAt, @Schema(nullable = true) String updatedByName, boolean canEdit) {
}
