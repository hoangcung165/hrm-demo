package com.hrmdemo.dto.leave;

import java.util.UUID;

/** A Loại nghỉ as a request or a balance names it. */
public record LeaveTypeRef(UUID id, String code, String name, boolean active) {
}
