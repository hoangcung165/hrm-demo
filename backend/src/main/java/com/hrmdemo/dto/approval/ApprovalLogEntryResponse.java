package com.hrmdemo.dto.approval;

import java.time.Instant;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One line of the Nhật ký, oldest first.
 *
 * @param event       SUBMITTED, LEVEL_REACHED, ESCALATED, LEVEL_APPROVED, APPROVED, REJECTED, RETURNED,
 *                    RESUBMITTED, CANCELLED or AUTO_APPROVED
 * @param actor       null for the system
 * @param escalatedTo for ESCALATED: SENDER_LINE_MANAGER, PARENT_UNIT_HEAD or HR_ROLE
 */
public record ApprovalLogEntryResponse(String event, int level, @Schema(nullable = true) EmployeeCard actor,
        @Schema(nullable = true) EmployeeCard onBehalfOf, @Schema(nullable = true) String comment,
        @Schema(nullable = true) String escalatedTo, Instant at) {
}
