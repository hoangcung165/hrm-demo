package com.hrmdemo.service.allocation;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * A run of days on which one Employee's Tải phân bổ does not change: the same allocations cover every day of it.
 *
 * @param from first day, inclusive
 * @param to last day, inclusive
 * @param totalPercent the Tải phân bổ on each day: the sum of the parts
 * @param parts the allocations that make it up, in the order they start
 */
public record LoadPeriod(LocalDate from, LocalDate to, int totalPercent, List<Part> parts) {

    /** One allocation's share of a period. */
    public record Part(UUID allocationId, UUID projectId, int percent) {
    }

    public LoadPeriod {
        Objects.requireNonNull(from, "from");
        Objects.requireNonNull(to, "to");
        parts = List.copyOf(parts);
    }

    /** Above 100% is Quá tải; exactly 100% is not. */
    public boolean overloaded() {
        return totalPercent > 100;
    }

    /** This period cut to {@code [start, end]}, or null when they do not meet. */
    LoadPeriod clip(LocalDate start, LocalDate end) {
        if (from.isAfter(end) || to.isBefore(start)) {
            return null;
        }
        LocalDate f = from.isBefore(start) ? start : from;
        LocalDate t = to.isAfter(end) ? end : to;
        return f.equals(from) && t.equals(to) ? this : new LoadPeriod(f, t, totalPercent, parts);
    }
}
