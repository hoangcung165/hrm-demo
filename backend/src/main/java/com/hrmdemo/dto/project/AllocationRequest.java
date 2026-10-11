package com.hrmdemo.dto.project;

import java.time.LocalDate;
import java.util.UUID;

/**
 * A new Phân bổ of a project.
 *
 * @param employeeId    an active Employee
 * @param projectRoleId an active item of the Vai trò dự án catalog
 * @param percent       1 to 100
 * @param startDate     first day, within the project's dates
 * @param endDate       last day, included; within the project's dates
 */
public record AllocationRequest(UUID employeeId, UUID projectRoleId, Integer percent, LocalDate startDate,
        LocalDate endDate) {
}
