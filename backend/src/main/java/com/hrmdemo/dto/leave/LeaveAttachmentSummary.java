package com.hrmdemo.dto.leave;

import java.time.Instant;
import java.util.UUID;

/** A file of a Đơn nghỉ, without its content. */
public record LeaveAttachmentSummary(UUID id, String fileName, String contentType, int sizeBytes, Instant uploadedAt) {
}
