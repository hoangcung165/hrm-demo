package com.hrmdemo.service.approval;

import java.util.Set;
import java.util.UUID;

/**
 * The approvers of one level, as resolved when the request reaches it.
 *
 * @param approvers   the Employees who may approve; never the sender
 * @param escalated   whether the level's own rule gave nobody but the sender, so the request went up
 * @param escalatedTo the step of the escalation chain that gave the approvers, null when not escalated
 */
public record ResolvedApprovers(Set<UUID> approvers, boolean escalated, EscalationStep escalatedTo) {

    public ResolvedApprovers {
        approvers = Set.copyOf(approvers);
    }

    /** Tự đẩy lên cấp trên, tried in this order (glossary: "cuối cùng đến vai trò HR"). */
    public enum EscalationStep {
        /** The Quản lý trực tiếp of the sender. */
        SENDER_LINE_MANAGER,
        /** The Trưởng đơn vị of the unit above the sender's unit. */
        PARENT_UNIT_HEAD,
        /** Any Employee with the HR role other than the sender. */
        HR_ROLE
    }
}
