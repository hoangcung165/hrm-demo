package com.hrmdemo.service.leave;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/**
 * Published when people outside the approval steps should hear about a Đơn nghỉ: the people a new request copies
 * (CC), and the approvers of a request its sender cancelled after approval. The notification package turns it into
 * bell lines in the same transaction.
 *
 * @param recipients Employees to tell; never the sender
 */
public record LeaveNotice(Kind kind, UUID requestId, UUID senderId, Set<UUID> recipients, Instant at) {

    public enum Kind {
        /** A request was sent (or sent again) copying the recipients. */
        COPIED,
        /** The sender cancelled a request the recipients had approved; the days went back to the balance. */
        APPROVED_CANCELLED
    }
}
