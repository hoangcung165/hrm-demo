package com.hrmdemo.dto.leave;

import java.math.BigDecimal;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Số dư phép of one Employee for one Loại nghỉ and one year. For a limited type: what has accrued so far, what the
 * whole year gives, Đã dùng (approved), Đang chờ (waiting or returned), Còn lại (accrued minus used and pending, below
 * zero when leave was taken in advance), how much may still be taken in advance, and how much may be requested now.
 * An unlimited type (Nghỉ ốm, Không lương…) has only used and pending.
 * <p>
 * Phép tồn is part of the year: {@code used}, {@code pending} and {@code remaining} count its days, while
 * {@code accrued} and {@code entitled} are the year's own. {@code remaining} and {@code available} include the
 * Phép tồn that has not expired and leave out what expired unused.
 *
 * @param accrued          accrued to date; null for an unlimited type
 * @param entitled         what the whole year gives (the yearly entitlement, prorated in the year of hire); null for
 *                         an unlimited type
 * @param remaining        accrued minus used minus pending; negative after an advance; null for an unlimited type
 * @param advanceAvailable what may still be taken beyond the remaining days; 0 when advances are off
 * @param available        the most a new request may take: remaining plus the advance available; null for an
 *                         unlimited type
 * @param carryOver        the Phép tồn of the year, kept apart; null when the type has none that year
 */
public record LeaveBalance(UUID leaveTypeId, int year, boolean limited, @Schema(nullable = true) BigDecimal accrued,
        @Schema(nullable = true) BigDecimal entitled, BigDecimal used, BigDecimal pending,
        @Schema(nullable = true) BigDecimal remaining, BigDecimal advanceAvailable,
        @Schema(nullable = true) BigDecimal available, @Schema(nullable = true) LeaveCarryOver carryOver) {
}
