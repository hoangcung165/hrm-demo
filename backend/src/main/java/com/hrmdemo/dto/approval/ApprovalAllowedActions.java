package com.hrmdemo.dto.approval;

import com.hrmdemo.dto.employee.EmployeeCard;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * What the caller may do with the request now; the API checks again on every action.
 *
 * @param decide     approve, reject and return (an approver of the waiting level, or their delegate)
 * @param onBehalfOf when {@code decide} comes from an Ủy quyền duyệt: the approver the caller stands in for
 * @param resubmit   the sender, while it is returned
 * @param cancel     the sender, while it is waiting or returned
 */
public record ApprovalAllowedActions(boolean decide, @Schema(nullable = true) EmployeeCard onBehalfOf,
        boolean resubmit, boolean cancel) {
}
