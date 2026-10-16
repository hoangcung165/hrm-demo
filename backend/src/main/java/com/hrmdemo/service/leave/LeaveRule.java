package com.hrmdemo.service.leave;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.MonthDay;

import com.hrmdemo.dto.leave.LeaveAccrual;
import com.hrmdemo.dto.leave.LeavePay;

/**
 * One version of the Chính sách phép of a Loại nghỉ, in force from {@code effectiveFrom} until the next version.
 *
 * @param limited            the type has a Số dư phép: a request may not take more than it allows
 * @param entitlementDays    Định mức phép năm before seniority (limited types only)
 * @param seniorityStepYears one more day per this many full years of service; null or 0 for none
 * @param accrual            monthly (Phép năm) or the whole year at once (limited types only)
 * @param cutOffDay          a hire on or before this day of the month earns that month; later hires start with the
 *                           next month
 * @param advanceAllowed     Ứng trước phép: a request may take up to the whole year's entitlement, so the balance
 *                           can go below zero
 * @param maxDaysPerRequest  the most one request may take (Việc riêng có lương…); null for no limit
 * @param carryOverMaxDays   Phép tồn kept into the next year; applied by the year-end job of HRM-19
 * @param carryOverExpiry    the day Phép tồn expires in the next year; applied by HRM-19
 */
public record LeaveRule(LocalDate effectiveFrom, LeavePay pay, boolean halfDayAllowed, boolean attachmentRequired,
        boolean limited, BigDecimal entitlementDays, Integer seniorityStepYears, LeaveAccrual accrual, int cutOffDay,
        boolean advanceAllowed, BigDecimal maxDaysPerRequest, BigDecimal carryOverMaxDays, MonthDay carryOverExpiry) {
}
