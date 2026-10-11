package com.hrmdemo.dto.project;

import java.time.LocalDate;
import java.util.UUID;

/** Replaces the role, percent and dates of a Phân bổ; the Employee never changes. Fields as in {@link AllocationRequest}. */
public record AllocationUpdateRequest(UUID projectRoleId, Integer percent, LocalDate startDate, LocalDate endDate) {
}
