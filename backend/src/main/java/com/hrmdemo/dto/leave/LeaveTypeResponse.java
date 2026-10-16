package com.hrmdemo.dto.leave;

import java.util.List;
import java.util.UUID;

/**
 * A Loại nghỉ with the Chính sách phép in force today and, for the settings page, every version.
 *
 * @param versions every version, oldest first; empty in the list for the request form
 */
public record LeaveTypeResponse(UUID id, String code, String name, int sortOrder, boolean active,
        LeavePolicyValues policy, List<LeavePolicyValues> versions) {
}
