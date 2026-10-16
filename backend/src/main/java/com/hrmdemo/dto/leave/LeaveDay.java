package com.hrmdemo.dto.leave;

import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One day of a Đơn nghỉ and what it counts: 1 for a whole working day, 0.5 for a half, 0 on a day off or a holiday.
 *
 * @param morning     the morning is taken and counts
 * @param afternoon   the afternoon is taken and counts
 * @param holidayName the holiday's name on a {@link LeaveDayKind#HOLIDAY}; null otherwise
 */
public record LeaveDay(LocalDate date, LeaveDayKind kind, boolean morning, boolean afternoon, BigDecimal value,
        @Schema(nullable = true) String holidayName) {
}
