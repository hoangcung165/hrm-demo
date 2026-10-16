package com.hrmdemo.service.leave;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * A day another request of the same Employee already holds: approved ones count as Đã dùng, waiting and returned
 * ones as Đang chờ. Only days that count (a half or a whole) are booked.
 */
public record BookedDay(UUID requestId, UUID leaveTypeId, LocalDate date, boolean morning, boolean afternoon,
        BigDecimal value, boolean approved) {
}
