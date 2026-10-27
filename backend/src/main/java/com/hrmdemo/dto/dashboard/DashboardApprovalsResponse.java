package com.hrmdemo.dto.dashboard;

import java.util.List;

/**
 * The "Chờ bạn duyệt" block: the first requests waiting for the caller, in the order of the inbox's waiting tab
 * (soonest Tự duyệt first), and how many wait in all.
 *
 * @param total every request waiting for the caller, not only the ones listed
 */
public record DashboardApprovalsResponse(List<DashboardApprovalItem> items, long total) {
}
