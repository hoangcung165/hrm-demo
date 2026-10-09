package com.hrmdemo.service.approval;

import java.util.Objects;

import com.hrmdemo.dto.approval.ApproverRule;
import com.hrmdemo.entity.auth.Role;

/**
 * One level of a Luồng phê duyệt: how its approvers are found.
 *
 * @param rule the approver rule
 * @param role the role for {@link ApproverRule#ROLE}, null otherwise
 */
public record ApprovalLevel(ApproverRule rule, Role role) {

    public ApprovalLevel {
        Objects.requireNonNull(rule, "rule");
        if ((rule == ApproverRule.ROLE) != (role != null)) {
            throw new IllegalArgumentException("A role level names exactly one role; other levels name none");
        }
    }

    public static ApprovalLevel lineManager() {
        return new ApprovalLevel(ApproverRule.LINE_MANAGER, null);
    }

    public static ApprovalLevel projectManager() {
        return new ApprovalLevel(ApproverRule.PROJECT_MANAGER, null);
    }

    public static ApprovalLevel role(Role role) {
        return new ApprovalLevel(ApproverRule.ROLE, role);
    }
}
