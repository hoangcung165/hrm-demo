package com.hrmdemo.dto.project;

import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One row of the project list.
 *
 * @param client  null for an internal project
 * @param canEdit whether the caller may edit it: "Quản lý mọi dự án", or its PM with "Thêm và sửa dự án của mình"
 * @param members  head counts of its running and upcoming Phân bổ
 */
public record ProjectListItem(UUID id, String code, String name, @Schema(nullable = true) String client,
        EmployeeCard pm, ProjectUnitRef orgUnit, LocalDate startDate, LocalDate endDate, String status,
        boolean canEdit, ProjectMembers members) {
}
