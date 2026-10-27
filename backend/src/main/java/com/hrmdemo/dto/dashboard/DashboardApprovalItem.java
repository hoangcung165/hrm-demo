package com.hrmdemo.dto.dashboard;

import java.util.List;

import com.hrmdemo.dto.approval.ApprovalInboxItem;
import com.hrmdemo.dto.approval.ApprovalWarning;

/**
 * One request waiting for the caller, as the Hộp thư duyệt shows it, with what the dashboard adds.
 *
 * @param warnings        what the approver should look at first; empty when nothing
 * @param quickApprovable whether Duyệt may be one click on the dashboard: false when there is any warning
 */
public record DashboardApprovalItem(ApprovalInboxItem request, List<ApprovalWarning> warnings,
        boolean quickApprovable) {
}
