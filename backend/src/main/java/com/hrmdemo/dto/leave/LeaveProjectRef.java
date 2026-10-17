package com.hrmdemo.dto.leave;

import java.util.UUID;

/** A Dự án the sender of a Đơn nghỉ is allocated to during the leave, so whoever decides sees what it touches. */
public record LeaveProjectRef(UUID id, String code, String name) {
}
