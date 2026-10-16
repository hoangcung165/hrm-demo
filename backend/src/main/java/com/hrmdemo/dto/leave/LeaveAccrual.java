package com.hrmdemo.dto.leave;

/**
 * How a limited Loại nghỉ is granted over a year: 1/12 of the yearly entitlement at the start of every month worked
 * ({@code MONTHLY}, Phép năm), or the whole year's entitlement on 1 January ({@code YEARLY}). Both are prorated for
 * the year of hire.
 */
public enum LeaveAccrual {
    MONTHLY,
    YEARLY
}
