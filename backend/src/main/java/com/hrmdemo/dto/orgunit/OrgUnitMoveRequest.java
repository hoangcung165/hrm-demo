package com.hrmdemo.dto.orgunit;

import java.util.UUID;

/** @param parentId the new parent unit, or null to move the unit directly under the company */
public record OrgUnitMoveRequest(UUID parentId) {
}
