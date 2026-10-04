package com.hrmdemo.dto.orgunit;

import java.util.UUID;

/** Just enough of a unit to name it, e.g. the holder of a code in the {@code org_unit.code_taken} error. */
public record OrgUnitRef(UUID id, String code, String name) {
}
