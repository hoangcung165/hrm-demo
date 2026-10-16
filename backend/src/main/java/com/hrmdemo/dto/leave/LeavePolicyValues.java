package com.hrmdemo.dto.leave;

import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One version of a Chính sách phép, as read and as saved. The service checks every field and reports all failing
 * ones at once. For a type that is not limited the entitlement, seniority, accrual, advance and carry-over fields are
 * not used and are stored empty.
 *
 * @param effectiveFrom      the first day the version is in force; saving on the date of an existing version
 *                           replaces it
 * @param limited            the type has a Số dư phép (Phép năm)
 * @param entitlementDays    Định mức phép năm before seniority, 0.5 to 365 (limited types)
 * @param seniorityStepYears one more day per this many full years of service, 1 to 50; null for none
 * @param accrual            MONTHLY or YEARLY (limited types)
 * @param cutOffDay          1 to 31: a hire on or before this day of the month earns that month
 * @param advanceAllowed     Ứng trước phép up to the whole year's entitlement (limited types)
 * @param maxDaysPerRequest  0.5 to 366; null for no limit
 * @param carryOverMaxDays   Phép tồn kept into the next year, 0 to 365; null for none
 * @param carryOverExpiry    MM-DD of the next year when Phép tồn expires; null for none
 */
public record LeavePolicyValues(LocalDate effectiveFrom, LeavePay pay, Boolean halfDayAllowed,
        Boolean attachmentRequired, Boolean limited, @Schema(nullable = true) BigDecimal entitlementDays,
        @Schema(nullable = true) Integer seniorityStepYears, @Schema(nullable = true) LeaveAccrual accrual,
        Integer cutOffDay, Boolean advanceAllowed, @Schema(nullable = true) BigDecimal maxDaysPerRequest,
        @Schema(nullable = true) BigDecimal carryOverMaxDays, @Schema(nullable = true) String carryOverExpiry) {
}
