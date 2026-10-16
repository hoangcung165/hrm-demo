package com.hrmdemo.dto.leave;

import java.util.List;

/**
 * The Loại nghỉ. For the request form: the active ones with today's policy. For the settings page: all of them
 * with every version.
 *
 * @param canEdit the caller may change them ({@code LEAVE_POLICY_EDIT})
 */
public record LeaveTypesResponse(List<LeaveTypeResponse> items, boolean canEdit) {
}
