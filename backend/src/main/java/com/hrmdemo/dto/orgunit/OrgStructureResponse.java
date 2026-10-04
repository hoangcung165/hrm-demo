package com.hrmdemo.dto.orgunit;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The whole org tree in one response.
 *
 * @param root  the company node
 * @param units every unit, inactive ones included, parents before their children and siblings in display order
 */
public record OrgStructureResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) OrgRootResponse root,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<OrgUnitResponse> units,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Summary summary) {

    /**
     * @param activeUnitCount units that are active (the company node is not counted)
     * @param employeeCount   every Employee of the company
     */
    public record Summary(
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) int activeUnitCount,
            @Schema(requiredMode = Schema.RequiredMode.REQUIRED) long employeeCount) {
    }
}
