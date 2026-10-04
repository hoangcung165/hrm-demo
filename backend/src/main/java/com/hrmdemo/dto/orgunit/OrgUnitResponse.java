package com.hrmdemo.dto.orgunit;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One Đơn vị tổ chức in the tree.
 *
 * @param parentId        null when the unit sits directly under the company
 * @param head            null while the unit has no head
 * @param headcountDirect Employees who belong to this unit itself
 * @param headcountTotal  Employees of this unit and of every unit below it
 * @param childCount      direct child units, active or not
 * @param sortOrder       order among siblings; ties are broken by name
 */
public record OrgUnitResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String code,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"BRANCH", "DEPARTMENT", "TEAM"})
        String type,
        @Schema(nullable = true) UUID parentId,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) boolean active,
        @Schema(nullable = true) OrgUnitHead head,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long headcountDirect,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long headcountTotal,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int childCount,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int sortOrder) {
}
