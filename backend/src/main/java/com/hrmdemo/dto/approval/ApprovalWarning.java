package com.hrmdemo.dto.approval;

import java.util.Map;

/**
 * Something an approver should look at before deciding, so the request is opened rather than approved in one click.
 * A code the web app words (vi/en) and the numbers it needs.
 * <ul>
 * <li>{@code leave.advance}: the leave goes beyond what has accrued so far ({@code remaining}, below zero).</li>
 * <li>{@code leave.over_balance}: more than the Số dư phép allows even with the advance ({@code remaining},
 * {@code available}).</li>
 * <li>{@code leave.attachment}: the request carries files to check ({@code count}).</li>
 * </ul>
 */
public record ApprovalWarning(String code, Map<String, Object> details) {

    public ApprovalWarning {
        details = Map.copyOf(details);
    }

    public static ApprovalWarning of(String code) {
        return new ApprovalWarning(code, Map.of());
    }
}
