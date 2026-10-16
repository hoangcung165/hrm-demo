package com.hrmdemo.dto.leave;

import java.util.Map;

/**
 * Why a Đơn nghỉ cannot be sent as it is: a code the web app words (vi/en) and the numbers or dates it needs.
 * <ul>
 * <li>{@code leave.invalid_dates}: the last day is before the first one.</li>
 * <li>{@code leave.invalid_part}: a day part that does not fit (the first day "until noon" of several days…).</li>
 * <li>{@code leave.half_day_not_allowed}: the type takes whole days only.</li>
 * <li>{@code leave.range_too_long}: more than a year from the first to the last day.</li>
 * <li>{@code leave.no_policy}: the type has no Chính sách phép in force on the first day.</li>
 * <li>{@code leave.before_hire}: starts before the hire date ({@code hireDate}).</li>
 * <li>{@code leave.no_working_day}: only days off and holidays.</li>
 * <li>{@code leave.over_max_per_request}: more days than the type allows at once ({@code max}).</li>
 * <li>{@code leave.attachment_required}: the type needs a file (Nghỉ ốm…).</li>
 * <li>{@code leave.overlap}: another request of the Employee already takes some of these days ({@code dates}).</li>
 * <li>{@code leave.over_balance}: more than the Số dư phép allows ({@code year}, {@code requested},
 * {@code remaining}, {@code advanceAvailable}, {@code available}, {@code over}).</li>
 * </ul>
 */
public record LeaveProblem(String code, Map<String, Object> details) {

    public LeaveProblem {
        details = Map.copyOf(details);
    }

    public static LeaveProblem of(String code) {
        return new LeaveProblem(code, Map.of());
    }
}
