package com.hrmdemo.dto.leave;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** One row of "Đơn của tôi". */
public record LeaveRequestListItem(UUID id, LeaveRequestStatus status, LeaveTypeRef leaveType, LocalDate startDate,
        DayPart startPart, LocalDate endDate, DayPart endPart, BigDecimal days, boolean canCancel,
        Instant createdAt) {
}
