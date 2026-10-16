package com.hrmdemo.dto.leave;

/**
 * A new Loại nghỉ with its first policy.
 *
 * @param code 1 to 20 letters, digits, '-' or '_', unique (case ignored)
 * @param name 1 to 100 characters
 */
public record LeaveTypeCreateRequest(String code, String name, LeavePolicyValues policy) {
}
