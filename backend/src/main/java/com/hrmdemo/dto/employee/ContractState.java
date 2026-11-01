package com.hrmdemo.dto.employee;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** Where a contract term stands on the company date. Terms are inclusive; the same rule as the profile's Hợp đồng tab. */
public enum ContractState {
    UPCOMING, CURRENT, EXPIRING, ENDED;

    /** A contract that ends within this many days (inclusive) is {@link #EXPIRING}. */
    public static final int EXPIRING_DAYS = 30;

    public static ContractState of(LocalDate startsOn, LocalDate endsOn, LocalDate today) {
        if (startsOn.isAfter(today)) return UPCOMING;
        if (endsOn == null) return CURRENT;
        if (endsOn.isBefore(today)) return ENDED;
        return ChronoUnit.DAYS.between(today, endsOn) <= EXPIRING_DAYS ? EXPIRING : CURRENT;
    }

    /** Days left until the end date for a running, dated contract; otherwise null. */
    public static Integer daysRemaining(ContractState state, LocalDate endsOn, LocalDate today) {
        if (endsOn == null || (state != CURRENT && state != EXPIRING)) return null;
        return (int) ChronoUnit.DAYS.between(today, endsOn);
    }
}
