package com.hrmdemo.service.leave;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.leave.LeaveCarryOver;

/**
 * Phép tồn, a part of the Chính sách phép module: pure functions like the rest of it, so nothing is stored and no
 * year-end job can drift. The unused Phép năm of year Y-1 becomes Phép tồn on 1 January of Y, up to the
 * {@code carryOverMaxDays} of the version in force that day, and can be taken until {@code carryOverExpiry}. Days
 * (approved or waiting) dated on or before the expiry come off it first; whatever is left after the expiry is lost.
 * Last year's unused days are what its own entitlement left after the days not covered by its own Phép tồn, so a
 * Phép tồn that expired is never carried a second time.
 */
final class CarryOverRules {

    private CarryOverRules() {
    }

    /** The Phép tồn of a year: its size and last day. */
    record Grant(BigDecimal granted, LocalDate expiresOn) {
    }

    /**
     * The Phép tồn of {@code year}, or null when there is none: the type has no carry-over in the version of 1
     * January, nothing was worked the year before, or {@code asOf} is before 1 January (it is given on that day).
     */
    static Grant grant(UUID leaveTypeId, List<LeaveRule> history, LocalDate hireDate, int year, LocalDate asOf,
            Collection<BookedDay> booked) {
        if (asOf.isBefore(LocalDate.of(year, 1, 1))) {
            return null;
        }
        return grantOf(leaveTypeId, history, hireDate, year, booked);
    }

    /** The days of a type dated in {@code year} up to {@code through}, whether approved or waiting. */
    static BigDecimal taken(UUID leaveTypeId, Collection<BookedDay> booked, int year, LocalDate through) {
        BigDecimal sum = BigDecimal.ZERO;
        for (BookedDay day : booked) {
            if (day.leaveTypeId().equals(leaveTypeId) && day.date().getYear() == year
                    && !day.date().isAfter(through)) {
                sum = sum.add(day.value());
            }
        }
        return LeavePolicyEngine.scaled(sum);
    }

    /** What the days taken in the year used of the grant: those up to its expiry, at most its size. */
    static BigDecimal used(UUID leaveTypeId, Grant grant, Collection<BookedDay> booked, int year) {
        return LeavePolicyEngine.scaled(taken(leaveTypeId, booked, year, grant.expiresOn()).min(grant.granted()));
    }

    /** The grant as the balance reports it on {@code asOf}. */
    static LeaveCarryOver report(UUID leaveTypeId, Grant grant, Collection<BookedDay> booked, int year,
            LocalDate asOf) {
        BigDecimal used = used(leaveTypeId, grant, booked, year);
        BigDecimal left = LeavePolicyEngine.scaled(grant.granted().subtract(used));
        boolean expired = asOf.isAfter(grant.expiresOn());
        BigDecimal zero = LeavePolicyEngine.scaled(BigDecimal.ZERO);
        return new LeaveCarryOver(LeavePolicyEngine.scaled(grant.granted()), used, expired ? zero : left,
                expired ? left : zero, grant.expiresOn());
    }

    private static Grant grantOf(UUID leaveTypeId, List<LeaveRule> history, LocalDate hireDate, int year,
            Collection<BookedDay> booked) {
        if (year <= hireDate.getYear()) {
            return null;
        }
        LeaveRule rule = LeavePolicyEngine.ruleOn(history, LocalDate.of(year, 1, 1));
        if (rule == null || !rule.limited() || rule.carryOverMaxDays() == null
                || rule.carryOverMaxDays().signum() <= 0 || rule.carryOverExpiry() == null) {
            return null;
        }
        BigDecimal granted = unusedOf(leaveTypeId, history, hireDate, year - 1, booked).min(rule.carryOverMaxDays());
        return new Grant(LeavePolicyEngine.scaled(granted), rule.carryOverExpiry().atYear(year));
    }

    /** What a whole year's own entitlement left: accrued minus the days its own Phép tồn did not cover, never below 0. */
    private static BigDecimal unusedOf(UUID leaveTypeId, List<LeaveRule> history, LocalDate hireDate, int year,
            Collection<BookedDay> booked) {
        LocalDate yearEnd = LocalDate.of(year, 12, 31);
        BigDecimal accrued = LeavePolicyEngine.entitlement(history, hireDate, year, yearEnd).accrued();
        BigDecimal taken = taken(leaveTypeId, booked, year, yearEnd);
        Grant own = grantOf(leaveTypeId, history, hireDate, year, booked);
        BigDecimal fromCarry = own == null ? BigDecimal.ZERO : used(leaveTypeId, own, booked, year);
        BigDecimal fromEntitlement = taken.subtract(fromCarry).max(BigDecimal.ZERO);
        return accrued.subtract(fromEntitlement).max(BigDecimal.ZERO);
    }
}
