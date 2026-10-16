package com.hrmdemo.service.notification;

import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.notification.NotificationKind;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.leave.LeaveNotice;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Bell lines for a Đơn nghỉ beyond the approval steps (HRM-18): LEAVE_COPIED to the people a request copies, and
 * LEAVE_CANCELLED to its approvers when the sender cancels it after approval. Written before the change commits, like
 * the approval notifications; no email.
 */
@Component
@RequiredArgsConstructor
class LeaveNotificationListener {

    private final NotificationService notifications;
    private final ApprovalRequestService requests;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    void record(LeaveNotice notice) {
        if (notice.recipients().isEmpty()) {
            return;
        }
        NotificationKind kind = switch (notice.kind()) {
            case COPIED -> NotificationKind.LEAVE_COPIED;
            case APPROVED_CANCELLED -> NotificationKind.LEAVE_CANCELLED;
        };
        String summary = requests.summary(notice.requestId()).summary();
        notifications.record(notice.recipients(), kind, notice.requestId(), null, notice.senderId(), null,
                ApprovalRequestType.LEAVE, summary, null);
    }
}
