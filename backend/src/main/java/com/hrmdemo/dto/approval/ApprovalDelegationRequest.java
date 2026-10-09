package com.hrmdemo.dto.approval;

import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

/**
 * A new Ủy quyền duyệt of the caller's approvals.
 *
 * @param delegateId   the active Employee who approves in the caller's place; not the caller
 * @param startDate    first day, today or later
 * @param endDate      last day, included; not before {@code startDate}
 * @param requestTypes the types covered; never {@code PAYROLL}
 */
public record ApprovalDelegationRequest(@NotNull UUID delegateId, @NotNull LocalDate startDate,
        @NotNull LocalDate endDate, @NotEmpty Set<@NotNull ApprovalRequestType> requestTypes) {
}
