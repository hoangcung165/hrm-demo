package com.hrmdemo.dto.orgunit;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The top of the org tree: the company (Pháp nhân) itself. It is not an Organization unit, so it has no id;
 * units with {@code parentId: null} are its children.
 *
 * @param head            the legal representative from company info, or null when none is recorded
 * @param headcountDirect Employees who belong to no unit
 * @param headcountTotal  every Employee of the company
 * @param childCount      top-level units, active or not
 */
public record OrgRootResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"COMPANY"}) String type,
        @Schema(nullable = true) OrgUnitHead head,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long headcountDirect,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long headcountTotal,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int childCount) {

    public static final String TYPE = "COMPANY";
}
