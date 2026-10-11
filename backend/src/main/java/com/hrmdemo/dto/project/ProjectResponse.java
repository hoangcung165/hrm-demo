package com.hrmdemo.dto.project;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One Dự án.
 *
 * @param client      null for an internal project
 * @param laborBudget Ngân sách nhân sự in VND, or null
 * @param canEdit     whether the caller may edit it and its Phân bổ
 * @param members     head counts of its running and upcoming Phân bổ
 */
public record ProjectResponse(UUID id, String code, String name, @Schema(nullable = true) String client,
        EmployeeCard pm, ProjectUnitRef orgUnit, LocalDate startDate, LocalDate endDate, String status,
        @Schema(nullable = true) Long laborBudget, boolean canEdit, ProjectMembers members, Instant createdAt,
        Instant updatedAt) {
}
