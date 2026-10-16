package com.hrmdemo.dto.leave;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * The Phép tồn of one year, kept apart from the year's own Phép năm: what last year's unused days gave, how much of it
 * leave taken up to the expiry day used, what is still there, and what was lost once the expiry day had passed.
 * Days taken on or before {@code expiresOn} come off it first.
 *
 * @param granted   last year's unused Phép năm, up to the policy's maximum
 * @param used      days (approved and waiting) taken from it
 * @param remaining still usable today: zero after the expiry day
 * @param lost      what expired unused; zero until the expiry day has passed
 * @param expiresOn the last day Phép tồn can be taken
 */
public record LeaveCarryOver(BigDecimal granted, BigDecimal used, BigDecimal remaining, BigDecimal lost,
        LocalDate expiresOn) {
}
