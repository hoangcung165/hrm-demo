package com.hrmdemo.dto.resource;

import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.dto.catalog.CatalogItemRef;
import io.swagger.v3.oas.annotations.media.Schema;

/** One Phân bổ as a list row names it: the project, the role, the share and the dates. */
public record AllocationBrief(UUID id, UUID projectId, String projectCode, String projectName,
        @Schema(nullable = true) CatalogItemRef projectRole, int percent, LocalDate startDate, LocalDate endDate) {
}
