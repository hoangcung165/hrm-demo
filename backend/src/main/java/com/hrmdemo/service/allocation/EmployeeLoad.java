package com.hrmdemo.service.allocation;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * One Employee's Tải phân bổ over a window, as consecutive periods. Days no allocation covers are left out, so two
 * periods can be apart.
 */
public record EmployeeLoad(UUID employeeId, List<LoadPeriod> periods) {

    public EmployeeLoad {
        Objects.requireNonNull(employeeId, "employeeId");
        periods = List.copyOf(periods);
    }

    /** The highest load on any day, 0 when nothing is allocated. */
    public int peak() {
        return periods.stream().mapToInt(LoadPeriod::totalPercent).max().orElse(0);
    }

    /** The periods above 100%. */
    public List<LoadPeriod> overloadedPeriods() {
        return periods.stream().filter(LoadPeriod::overloaded).toList();
    }

    public boolean overloaded() {
        return periods.stream().anyMatch(LoadPeriod::overloaded);
    }

    /** The periods cut to {@code [from, to]}. */
    public EmployeeLoad within(LocalDate from, LocalDate to) {
        return new EmployeeLoad(employeeId, periods.stream()
                .map(p -> p.clip(from, to))
                .filter(Objects::nonNull)
                .toList());
    }

    /** The load on one day, 0 when nothing is allocated. */
    public int on(LocalDate day) {
        return periods.stream()
                .filter(p -> !p.from().isAfter(day) && !p.to().isBefore(day))
                .mapToInt(LoadPeriod::totalPercent)
                .findFirst()
                .orElse(0);
    }
}
