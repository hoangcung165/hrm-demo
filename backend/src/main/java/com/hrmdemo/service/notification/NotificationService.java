package com.hrmdemo.service.notification;

import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.dto.notification.NotificationItem;
import com.hrmdemo.dto.notification.NotificationKind;
import com.hrmdemo.dto.notification.NotificationsResponse;
import com.hrmdemo.dto.notification.UnreadCountResponse;
import com.hrmdemo.entity.notification.Notification;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.notification.NotificationRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The bell of each Employee. Notifications are written by the listeners of this package; an Account without an
 * Employee has an empty bell.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int MAX_PAGE_SIZE = 50;

    private final NotificationRepository notifications;
    private final EmployeeService employees;
    private final Clock clock;

    @Transactional(readOnly = true)
    public NotificationsResponse list(CurrentAccount caller, int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "page from 0, size 1 to 50");
        }
        UUID me = caller.employeeId();
        if (me == null) {
            return new NotificationsResponse(List.of(), 0, 0);
        }
        Page<Notification> found = notifications.findByRecipientIdOrderByCreatedAtDesc(me, PageRequest.of(page, size));
        Set<UUID> people = new HashSet<>();
        for (Notification n : found) {
            addIfPresent(people, n.getActorId());
            addIfPresent(people, n.getOnBehalfOfId());
        }
        Map<UUID, EmployeeCard> cards = employees.cards(people);
        List<NotificationItem> items = found.getContent().stream().map(n -> item(n, cards)).toList();
        return new NotificationsResponse(items, found.getTotalElements(),
                notifications.countByRecipientIdAndReadAtIsNull(me));
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse unread(CurrentAccount caller) {
        UUID me = caller.employeeId();
        return new UnreadCountResponse(me == null ? 0 : notifications.countByRecipientIdAndReadAtIsNull(me));
    }

    @Transactional
    public UnreadCountResponse markRead(CurrentAccount caller, UUID id) {
        UUID me = caller.employeeId();
        Notification notification = (me == null ? Optional.<Notification>empty()
                : notifications.findByIdAndRecipientId(id, me))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "notification.not_found",
                        "No such notification of yours"));
        notification.markRead(clock.instant());
        return new UnreadCountResponse(notifications.countByRecipientIdAndReadAtIsNull(me));
    }

    @Transactional
    public UnreadCountResponse markAllRead(CurrentAccount caller) {
        UUID me = caller.employeeId();
        if (me != null) {
            notifications.markAllRead(me, clock.instant());
        }
        return new UnreadCountResponse(0);
    }

    /** Writes one notification per recipient; called in the transaction of the change it is about. */
    void record(Set<UUID> recipients, NotificationKind kind, UUID requestId, UUID delegationId, UUID actorId,
            UUID onBehalfOfId, ApprovalRequestType requestType, String summary, Integer level) {
        for (UUID recipient : recipients) {
            notifications.save(new Notification(recipient, kind.name(), requestId, delegationId, actorId,
                    onBehalfOfId, requestType == null ? null : requestType.name(), summary, level, clock.instant()));
        }
    }

    private static NotificationItem item(Notification n, Map<UUID, EmployeeCard> cards) {
        return new NotificationItem(n.getId(), NotificationKind.valueOf(n.getKind()),
                n.getActorId() == null ? null : cards.get(n.getActorId()),
                n.getOnBehalfOfId() == null ? null : cards.get(n.getOnBehalfOfId()), n.getRequestId(),
                n.getRequestType() == null ? null : ApprovalRequestType.valueOf(n.getRequestType()), n.getSummary(),
                n.getLevel(), n.getDelegationId(), n.getCreatedAt(), n.getReadAt() != null);
    }

    private static void addIfPresent(Set<UUID> ids, UUID id) {
        if (id != null) {
            ids.add(id);
        }
    }
}
