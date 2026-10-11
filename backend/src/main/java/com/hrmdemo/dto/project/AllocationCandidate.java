package com.hrmdemo.dto.project;

import java.time.LocalDate;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * An Employee to allocate, as the picker shows them.
 *
 * @param loadToday     Tải phân bổ today across every project
 * @param inProjectFrom the first day of their running or upcoming allocation in this project; null when they have none
 */
public record AllocationCandidate(EmployeeCard employee, int loadToday,
        @Schema(nullable = true) LocalDate inProjectFrom) {
}
