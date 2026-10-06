package com.hrmdemo.dto.catalog;

import java.time.LocalDate;
import java.util.Locale;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * A new or edited catalog item. Which fields a catalog takes is checked by the service, which also refuses a
 * field of another catalog. The name is trimmed; the code is trimmed and upper-cased.
 *
 * @param code      every catalog but holidays: 2 to 20 characters of A-Z, 0-9, "-" and "_"
 * @param term      contract types: {@code INDEFINITE}, {@code FIXED} or {@code PROBATION}
 * @param maxMonths contract types with term {@code FIXED}: 1 to 36
 * @param insurable allowance types: counts towards the social insurance base
 * @param taxable   allowance types: subject to personal income tax
 * @param startDate holidays: the first day off
 * @param endDate   holidays: the last day off, at most 10 days after the first
 */
public record CatalogItemRequest(
        @Schema(nullable = true) String code,
        @NotBlank @Size(max = 150) String name,
        @Schema(nullable = true, allowableValues = {"INDEFINITE", "FIXED", "PROBATION"}) String term,
        @Schema(nullable = true) Integer maxMonths,
        @Schema(nullable = true) Boolean insurable,
        @Schema(nullable = true) Boolean taxable,
        @Schema(nullable = true) LocalDate startDate,
        @Schema(nullable = true) LocalDate endDate) {

    public CatalogItemRequest {
        name = name == null ? null : name.trim();
        code = code == null ? null : code.trim().toUpperCase(Locale.ROOT);
    }
}
