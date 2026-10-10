package com.hrmdemo.dto.approval;

import java.util.List;

/**
 * The caller's delegations, each list upcoming and active first, then ended, latest start first.
 *
 * @param given    the caller's approvals handed to others ("Bạn ủy quyền cho người khác")
 * @param received approvals others handed to the caller ("Người khác ủy quyền cho bạn")
 */
public record ApprovalDelegationsResponse(List<ApprovalDelegationResponse> given,
        List<ApprovalDelegationResponse> received) {
}
