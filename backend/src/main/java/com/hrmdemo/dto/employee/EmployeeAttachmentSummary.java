package com.hrmdemo.dto.employee;

import java.time.Instant;
import java.util.UUID;

/** Metadata only: file bytes never appear in list responses. */
public record EmployeeAttachmentSummary(UUID id, String fileName, String contentType,
        int contentLength, String sha256, Instant uploadedAt) {
}
