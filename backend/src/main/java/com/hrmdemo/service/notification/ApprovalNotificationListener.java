package com.hrmdemo.service.notification;

import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.notification.NotificationKind;
import com.hrmdemo.service.approval.ApprovalDelegationCreated;
import com.hrmdemo.service.approval.ApprovalEvent;
import com.hrmdemo.service.approval.ApprovalRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Turns approval events into notifications and emails. The bell is written before the change commits, in its
 * transaction, so a change and its notifications land together; the emails go after the commit, so a change that
 * rolls back sends nothing.
 * <ul>
 * <li>A level is reached: its approvers (APPROVAL_WAITING, or APPROVAL_RESUBMITTED after a return), and an email.
 * Delegates see the request in their inbox and are not notified one by one.</li>
 * <li>Approved, rejected, returned: the sender, and an email.</li>
 * <li>A delegation is created: the delegate (bell only).</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
class ApprovalNotificationListener {

    private final NotificationService notifications;
    private final ApprovalRequestService requests;
    private final ApprovalMailer mailer;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    void recordApproval(ApprovalEvent event) {
        if (event.recipients().isEmpty()) {
            return;
        }
        ApprovalRequestService.Summary request = requests.summary(event.requestId());
        NotificationKind kind = kind(event, request);
        if (kind == null) {
            return;
        }
        UUID actor = event.type() == ApprovalEvent.Type.LEVEL_REACHED ? request.senderId() : event.actorId();
        notifications.record(event.recipients(), kind, event.requestId(), null, actor, event.onBehalfOf(),
                event.requestType(), request.summary(), event.level());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void mailApproval(ApprovalEvent event) {
        if (!event.recipients().isEmpty()) {
            mailer.send(event);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    void recordDelegation(ApprovalDelegationCreated event) {
        notifications.record(Set.of(event.delegateId()), NotificationKind.DELEGATION_RECEIVED, null,
                event.delegationId(), event.delegatorId(), null, null, null, null);
    }

    /** The notification an approval event gives, or null for the events nobody is told about. */
    static NotificationKind kind(ApprovalEvent event, ApprovalRequestService.Summary request) {
        return switch (event.type()) {
            case LEVEL_REACHED -> request.resubmittedAt(event.at())
                    ? NotificationKind.APPROVAL_RESUBMITTED : NotificationKind.APPROVAL_WAITING;
            case APPROVED -> NotificationKind.APPROVAL_APPROVED;
            case REJECTED -> NotificationKind.APPROVAL_REJECTED;
            case RETURNED -> NotificationKind.APPROVAL_RETURNED;
            default -> null;
        };
    }
}
