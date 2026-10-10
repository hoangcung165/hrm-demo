package com.hrmdemo.service.allocation;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.OptionalInt;

/**
 * What saving one allocation would do to its Employee's Tải phân bổ (the "thử phân bổ" check, nothing is saved).
 *
 * @param load the Employee's load over the window asked for, with the allocation in place
 * @param peak the highest load within the allocation's own range
 * @param overloadedPeriods the periods above 100% within the allocation's range; empty when saving overloads nobody
 * @param suggestedMaxPercent the highest percent that keeps every day of the range at or below 100%; empty when no
 *        percent fits (the other allocations already reach 100% on some day) or when nothing is overloaded
 * @param suggestedStart the first start date that keeps the range from there to the allocation's end at or below
 *        100% at the same percent; empty when the overload runs to the end or when nothing is overloaded
 */
public record TryAllocationResult(EmployeeLoad load, int peak, List<LoadPeriod> overloadedPeriods,
        OptionalInt suggestedMaxPercent, Optional<LocalDate> suggestedStart) {

    public TryAllocationResult {
        overloadedPeriods = List.copyOf(overloadedPeriods);
    }

    public boolean overloaded() {
        return !overloadedPeriods.isEmpty();
    }
}
