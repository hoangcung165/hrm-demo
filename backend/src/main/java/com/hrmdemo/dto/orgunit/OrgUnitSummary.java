package com.hrmdemo.dto.orgunit;

import java.util.UUID;

/**
 * One unit as other features' services read it (e.g. the Employee's unit and its Trưởng đơn vị).
 *
 * @param parentId       null when the unit sits directly under the company
 * @param headEmployeeId null while the head position is vacant
 */
public record OrgUnitSummary(UUID id, UUID parentId, String code, String name, boolean active, UUID headEmployeeId) {
}
