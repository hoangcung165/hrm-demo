package com.hrmdemo.service.allocation;

import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/**
 * One Phân bổ as the Bộ tính phân bổ sees it: an Employee gives {@code percent} of their working time to a Dự án
 * on every day from {@code from} to {@code to}, both inclusive. The project role does not change the load, so it is
 * not part of it.
 *
 * @param id identifies the allocation; a try allocation with the id of an existing one replaces it
 */
public record PlannedAllocation(UUID id, UUID employeeId, UUID projectId, int percent, LocalDate from,
        LocalDate to) {

    public PlannedAllocation {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(employeeId, "employeeId");
        Objects.requireNonNull(projectId, "projectId");
        Objects.requireNonNull(from, "from");
        Objects.requireNonNull(to, "to");
        if (percent < 1 || percent > 100) {
            throw new IllegalArgumentException("An allocation is 1 to 100 percent, not " + percent);
        }
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("An allocation ends on or after its start");
        }
    }

    /** Whether this allocation covers at least one day of {@code [start, end]}. */
    boolean overlaps(LocalDate start, LocalDate end) {
        return !from.isAfter(end) && !to.isBefore(start);
    }

    /** Whether this allocation covers {@code day}. */
    boolean covers(LocalDate day) {
        return !from.isAfter(day) && !to.isBefore(day);
    }
}
