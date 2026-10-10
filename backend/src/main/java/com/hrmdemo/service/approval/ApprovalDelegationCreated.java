package com.hrmdemo.service.approval;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Published when someone delegates their approvals, so the delegate hears of it. */
public record ApprovalDelegationCreated(UUID delegationId, UUID delegatorId, UUID delegateId, LocalDate startDate,
        LocalDate endDate, Instant at) {
}
