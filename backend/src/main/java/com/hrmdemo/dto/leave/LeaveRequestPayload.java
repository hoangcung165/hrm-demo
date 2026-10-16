package com.hrmdemo.dto.leave;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * A Đơn nghỉ as the sender writes it, to check, to send, or to send again after a return. The service checks every
 * field and reports all failing ones at once; the leave rules are reported as {@link LeaveProblem}s.
 *
 * @param startPart     FULL, or AFTERNOON to start at noon (one day: FULL, MORNING or AFTERNOON)
 * @param endPart       FULL, or MORNING to end at noon (one day: the same as {@code startPart})
 * @param reason        up to 500 characters
 * @param cc            people to copy, up to 10 active Employees other than the sender
 * @param attachmentIds files uploaded before ({@code POST /api/leave-attachments}), up to 5
 */
public record LeaveRequestPayload(UUID leaveTypeId, LocalDate startDate, DayPart startPart, LocalDate endDate,
        DayPart endPart, String reason, List<UUID> cc, List<UUID> attachmentIds) {
}
