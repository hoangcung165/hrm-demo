package com.hrmdemo.dto.legalentity;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;

/** Company info: the public face of the Pháp nhân (Legal entity). */
public record CompanyInfoResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(nullable = true) String taxCode,
        @Schema(nullable = true) String address,
        @Schema(nullable = true) String legalRepresentativeName,
        @Schema(nullable = true) String legalRepresentativeTitle,
        @Schema(nullable = true, description = "Relative URL of the logo, or null when there is none. "
                + "The v parameter changes with every upload, so the URL can be cached for good.",
                example = "/api/company/logo?v=1791100800000")
        String logoUrl,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant updatedAt) {
}
