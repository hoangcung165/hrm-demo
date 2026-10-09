package com.hrmdemo.dto.approval;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One Ủy quyền duyệt.
 *
 * @param requestTypes the types covered, in display order
 * @param endedAt      when it was ended early; null otherwise
 */
public record ApprovalDelegationResponse(UUID id, EmployeeCard delegator, EmployeeCard delegate,
        LocalDate startDate, LocalDate endDate, List<ApprovalRequestType> requestTypes,
        ApprovalDelegationStatus status, @Schema(nullable = true) Instant endedAt) {
}
