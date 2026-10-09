package com.hrmdemo.service.approval;

import java.util.List;

/** The result of one action: the new state and what happened, in order. */
public record ApprovalTransition(ApprovalRequestState state, List<ApprovalEvent> events) {

    public ApprovalTransition {
        events = List.copyOf(events);
    }
}
