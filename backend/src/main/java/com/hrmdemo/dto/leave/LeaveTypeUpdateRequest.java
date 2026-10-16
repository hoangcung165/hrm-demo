package com.hrmdemo.dto.leave;

/**
 * Renames a Loại nghỉ or turns it on or off. An inactive type takes no new request; its past requests stay.
 *
 * @param sortOrder its place in the lists, 1 to 999
 */
public record LeaveTypeUpdateRequest(String name, Boolean active, Integer sortOrder) {
}
