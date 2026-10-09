package com.hrmdemo.service.approval;

import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.dto.approval.ApproverRule;
import com.hrmdemo.exception.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Luồng phê duyệt of one request type: 1 to 3 levels, the optional auto-approve delay and whether Ủy quyền duyệt
 * applies. A request keeps the flow it was sent with, so a flow saved later does not change requests in progress.
 *
 * @param requestType        the request type
 * @param levels             1 to 3 levels, in order
 * @param autoApproveDays    calendar days after which a waiting level approves itself, or null for never
 * @param delegationAllowed  whether approvers' delegates may act
 */
public record ApprovalFlow(ApprovalRequestType requestType, List<ApprovalLevel> levels, Integer autoApproveDays,
        boolean delegationAllowed) {

    public static final int MAX_LEVELS = 3;
    public static final int MAX_AUTO_APPROVE_DAYS = 30;

    /** Checks the rules a stored or submitted flow must follow; the codes go to the flow configuration screen. */
    public ApprovalFlow {
        Objects.requireNonNull(requestType, "requestType");
        levels = List.copyOf(levels);
        if (levels.isEmpty() || levels.size() > MAX_LEVELS) {
            throw invalid("approval.flow_levels", "A flow has 1 to " + MAX_LEVELS + " levels");
        }
        if (requestType != ApprovalRequestType.TIMESHEET
                && levels.stream().anyMatch(level -> level.rule() == ApproverRule.PROJECT_MANAGER)) {
            throw invalid("approval.flow_project_manager_only_timesheet",
                    "Only timesheet levels can be approved by the PM of the project");
        }
        if (autoApproveDays != null) {
            if (!requestType.allowsAutoApproveAndDelegation()) {
                throw invalid("approval.flow_payroll_auto_approve", "Payroll is never auto-approved");
            }
            if (autoApproveDays < 1 || autoApproveDays > MAX_AUTO_APPROVE_DAYS) {
                throw invalid("approval.flow_auto_approve_days",
                        "Auto-approve after 1 to " + MAX_AUTO_APPROVE_DAYS + " days");
            }
        }
        if (delegationAllowed && !requestType.allowsAutoApproveAndDelegation()) {
            throw invalid("approval.flow_payroll_delegation", "Payroll approvals cannot be delegated");
        }
    }

    public int levelCount() {
        return levels.size();
    }

    /** The level, counted from 1 as on screen ("Cấp 2/3"). */
    public ApprovalLevel level(int number) {
        return levels.get(number - 1);
    }

    public Optional<Duration> autoApproveAfter() {
        return Optional.ofNullable(autoApproveDays).map(Duration::ofDays);
    }

    private static ApiException invalid(String code, String detail) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, detail);
    }
}
