package com.hrmdemo.dto.approval;

import java.util.List;

/** Every request type's flow, in the display order of {@link ApprovalRequestType}. */
public record ApprovalFlowsResponse(List<ApprovalFlowResponse> items) {
}
