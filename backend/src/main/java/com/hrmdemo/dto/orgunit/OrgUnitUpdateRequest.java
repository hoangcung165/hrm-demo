package com.hrmdemo.dto.orgunit;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Edits a unit's own details. The parent changes through "move" and the status through
 * "deactivate" / "reactivate". Text is normalised like in {@link OrgUnitCreateRequest}.
 *
 * @param headEmployeeId the Employee who heads the unit; null leaves the position vacant
 */
public record OrgUnitUpdateRequest(
        @NotBlank @Size(max = OrgUnitText.NAME_MAX) String name,
        @NotNull @Pattern(regexp = OrgUnitText.CODE_PATTERN) String code,
        @NotNull @Pattern(regexp = OrgUnitText.TYPE_PATTERN)
        @Schema(allowableValues = {"BRANCH", "DEPARTMENT", "TEAM"}) String type,
        UUID headEmployeeId) {

    public OrgUnitUpdateRequest {
        name = OrgUnitText.trim(name);
        code = OrgUnitText.code(code);
    }
}
