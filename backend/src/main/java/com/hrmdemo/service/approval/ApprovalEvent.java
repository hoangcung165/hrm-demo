package com.hrmdemo.service.approval;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.approval.ApprovalRequestType;

/**
 * Something that happened to a Yêu cầu phê duyệt. Every transition emits at least one; notifications, the log
 * and the request's own effects (applying a profile update, leave balances…) listen to them.
 *
 * @param type        what happened
 * @param requestId   the request
 * @param requestType its type
 * @param level       the level it happened at, counted from 1
 * @param actorId     the Employee who acted; null for the system (auto-approve)
 * @param onBehalfOf  the approver the actor acted for under an Ủy quyền duyệt; null otherwise
 * @param comment     the note, the reason of a reject or a return; null when none
 * @param escalatedTo for {@link Type#ESCALATED}, the step of the escalation chain that gave the approvers; null
 *                    otherwise
 * @param recipients  who should hear about it: the approvers for {@link Type#LEVEL_REACHED}, the sender for
 *                    {@link Type#APPROVED}, {@link Type#REJECTED} and {@link Type#RETURNED}; empty otherwise
 * @param at          when
 */
public record ApprovalEvent(Type type, UUID requestId, ApprovalRequestType requestType, int level, UUID actorId,
        UUID onBehalfOf, String comment, ResolvedApprovers.EscalationStep escalatedTo, Set<UUID> recipients,
        Instant at) {

    public ApprovalEvent {
        recipients = Set.copyOf(recipients);
    }

    public enum Type {
        /** The sender sent the request. */
        SUBMITTED,
        /** A level started waiting for its approvers. */
        LEVEL_REACHED,
        /** A level could not stay with its own rule because only the sender (or nobody) was left. */
        ESCALATED,
        /** A level that is not the last one was approved. */
        LEVEL_APPROVED,
        /** The last level was approved: the request is done and its effect applies. Final. */
        APPROVED,
        /** Final. */
        REJECTED,
        /** Back to the sender for more information. */
        RETURNED,
        /** The sender sent a returned request again. */
        RESUBMITTED,
        /** The sender withdrew it. Final. */
        CANCELLED,
        /** A level approved itself after the flow's delay (comes with LEVEL_APPROVED or APPROVED). */
        AUTO_APPROVED
    }
}
