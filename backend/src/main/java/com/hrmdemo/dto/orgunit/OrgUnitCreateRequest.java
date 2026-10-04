package com.hrmdemo.dto.orgunit;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * A new Đơn vị tổ chức. The name is trimmed and the code is trimmed and upper-cased before validation.
 *
 * @param code           2 to 10 characters of A-Z, 0-9 and "-"; unique in the company, whatever the case
 * @param parentId       the parent unit, or null to put the unit directly under the company
 * @param headEmployeeId the Employee who heads the unit, or null
 */
public record OrgUnitCreateRequest(
        @NotBlank @Size(max = OrgUnitText.NAME_MAX) String name,
        @NotNull @Pattern(regexp = OrgUnitText.CODE_PATTERN) String code,
        @NotNull @Pattern(regexp = OrgUnitText.TYPE_PATTERN)
        @Schema(allowableValues = {"BRANCH", "DEPARTMENT", "TEAM"}) String type,
        UUID parentId,
        UUID headEmployeeId) {

    public OrgUnitCreateRequest {
        name = OrgUnitText.trim(name);
        code = OrgUnitText.code(code);
    }
}
