package com.hrmdemo.dto.catalog;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One catalog item. Every catalog has the same shape; the fields of other catalogs are null.
 *
 * @param inUse true while another record refers to the item: it can then only be deactivated, not deleted
 */
public record CatalogItemResponse(
        UUID id,
        @Schema(nullable = true) String code,
        String name,
        boolean active,
        boolean inUse,
        @Schema(nullable = true, allowableValues = {"INDEFINITE", "FIXED", "PROBATION"}) String term,
        @Schema(nullable = true) Integer maxMonths,
        @Schema(nullable = true) Boolean insurable,
        @Schema(nullable = true) Boolean taxable,
        @Schema(nullable = true) LocalDate startDate,
        @Schema(nullable = true) LocalDate endDate,
        Instant createdAt,
        Instant updatedAt) {
}
