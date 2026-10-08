package com.hrmdemo.dto.orgunit;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One unit in a picker or a filter: directory data only, no head and no headcounts.
 *
 * @param parentId null when the unit sits directly under the company
 * @param active   false for a deactivated unit, which is listed too (its Employees are still there)
 */
public record OrgUnitOption(UUID id, String code, String name, @Schema(nullable = true) UUID parentId,
        boolean active) {
}
