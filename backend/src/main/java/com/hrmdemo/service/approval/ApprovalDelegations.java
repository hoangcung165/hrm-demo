package com.hrmdemo.service.approval;

import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.approval.ApprovalRequestType;

/**
 * The Ủy quyền duyệt in force: an approver hands their approvals of some request types to another Employee for a
 * date range. Read on every action, so a delegation covers requests that were already waiting when it started.
 * HRM-12/BE-4 stores them.
 */
public interface ApprovalDelegations {

    /** Nobody delegates: for flows that do not allow it, and until delegations are stored. */
    ApprovalDelegations NONE = (approver, type, date) -> Set.of();

    /** The Employees the approver has delegated this request type to on that date. */
    Set<UUID> delegatesOf(UUID approverEmployeeId, ApprovalRequestType type, LocalDate date);
}
