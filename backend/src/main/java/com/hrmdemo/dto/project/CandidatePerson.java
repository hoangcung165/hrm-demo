package com.hrmdemo.dto.project;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Who a Tìm người result is: directory data only, no profile data. */
public record CandidatePerson(UUID id, String code, String fullName,
        @Schema(nullable = true, description = "Null: directly under the company") String orgUnitName,
        @Schema(nullable = true) String positionName) {
}
