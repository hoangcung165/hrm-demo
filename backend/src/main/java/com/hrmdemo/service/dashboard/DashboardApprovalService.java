package com.hrmdemo.service.dashboard;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.approval.ApprovalBox;
import com.hrmdemo.dto.approval.ApprovalInboxItem;
import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.approval.ApprovalWarning;
import com.hrmdemo.dto.dashboard.DashboardApprovalItem;
import com.hrmdemo.dto.dashboard.DashboardApprovalsResponse;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.approval.ApprovalInboxService;
import com.hrmdemo.service.leave.LeaveApprovalWarnings;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The "Chờ bạn duyệt" block of the Tổng quan page (HRM-20): the first requests of the Hộp thư duyệt's waiting tab, so
 * the same people see the same requests in the same order, each with the warnings that keep it from being approved in
 * one click. Deciding goes through the approval endpoints unchanged, so levels, notifications and the log are the
 * inbox's own.
 */
@Service
@RequiredArgsConstructor
public class DashboardApprovalService {

    static final int MAX_LIMIT = 20;

    private final ApprovalInboxService inbox;
    private final LeaveApprovalWarnings leaveWarnings;

    @Transactional(readOnly = true)
    public DashboardApprovalsResponse waiting(CurrentAccount caller, int limit) {
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "limit from 1 to " + MAX_LIMIT);
        }
        PageResponse<ApprovalInboxItem> waiting = inbox.list(caller, ApprovalBox.WAITING, null, null, null, 0, limit);
        List<UUID> leaveIds = waiting.items().stream().filter(item -> item.type() == ApprovalRequestType.LEAVE)
                .map(ApprovalInboxItem::id).toList();
        Map<UUID, List<ApprovalWarning>> warnings = leaveIds.isEmpty() ? Map.of() : leaveWarnings.of(leaveIds);
        List<DashboardApprovalItem> items = waiting.items().stream().map(item -> {
            List<ApprovalWarning> found = warnings.getOrDefault(item.id(), List.of());
            return new DashboardApprovalItem(item, found, found.isEmpty());
        }).toList();
        return new DashboardApprovalsResponse(items, waiting.total());
    }
}
