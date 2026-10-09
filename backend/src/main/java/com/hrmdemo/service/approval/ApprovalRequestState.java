package com.hrmdemo.service.approval;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.approval.ApprovalStatus;

/**
 * A Yêu cầu phê duyệt as the approval engine sees it. Immutable: every action returns a new state.
 *
 * @param id                  the request
 * @param flow                the flow the request was sent with
 * @param senderId            the Employee who sent it
 * @param projectId           the project of a timesheet, null otherwise
 * @param status              where it stands
 * @param level               the current level counted from 1; the level that returned it while returned
 * @param approvers           who may approve the current level (delegates come on top, live)
 * @param escalated           whether the current level went up past its own rule (Tự đẩy lên cấp trên)
 * @param levelReachedAt      when the current level started waiting, or when it was resubmitted
 * @param waitedBeforeReturn  time the current level had already waited before a return: auto-approve pauses
 *                            while the request is with the sender
 */
public record ApprovalRequestState(UUID id, ApprovalFlow flow, UUID senderId, UUID projectId, ApprovalStatus status,
        int level, Set<UUID> approvers, boolean escalated, Instant levelReachedAt, Duration waitedBeforeReturn) {

    public ApprovalRequestState {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(flow, "flow");
        Objects.requireNonNull(senderId, "senderId");
        Objects.requireNonNull(status, "status");
        approvers = Set.copyOf(approvers);
        waitedBeforeReturn = waitedBeforeReturn == null ? Duration.ZERO : waitedBeforeReturn;
    }

    public ApprovalRequestType type() {
        return flow.requestType();
    }

    public boolean isLastLevel() {
        return level == flow.levelCount();
    }

    /** When the waiting level approves itself if nobody acts; empty when the flow never auto-approves. */
    public Optional<Instant> autoApproveDueAt() {
        if (status != ApprovalStatus.PENDING || levelReachedAt == null) {
            return Optional.empty();
        }
        return flow.autoApproveAfter().map(after -> levelReachedAt.plus(after.minus(waitedBeforeReturn)));
    }

    ApprovalRequestState atLevel(int newLevel, ResolvedApprovers resolved, Instant at) {
        return new ApprovalRequestState(id, flow, senderId, projectId, ApprovalStatus.PENDING, newLevel,
                resolved.approvers(), resolved.escalated(), at, Duration.ZERO);
    }

    ApprovalRequestState ended(ApprovalStatus finalStatus) {
        return new ApprovalRequestState(id, flow, senderId, projectId, finalStatus, level, Set.of(), false,
                levelReachedAt, waitedBeforeReturn);
    }

    ApprovalRequestState returned(Instant at) {
        Duration waited = waitedBeforeReturn.plus(Duration.between(levelReachedAt, at));
        return new ApprovalRequestState(id, flow, senderId, projectId, ApprovalStatus.RETURNED_FOR_INFO, level,
                Set.of(), false, levelReachedAt, waited);
    }

    ApprovalRequestState resubmitted(ResolvedApprovers resolved, Instant at) {
        return new ApprovalRequestState(id, flow, senderId, projectId, ApprovalStatus.PENDING, level,
                resolved.approvers(), resolved.escalated(), at, waitedBeforeReturn);
    }
}
