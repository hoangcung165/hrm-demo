package com.hrmdemo.repository.attendance;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.attendance.Punch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Lần quẹt of the company; queries are filtered by Legal entity (ADR 0003). */
public interface PunchRepository extends JpaRepository<Punch, UUID> {

    /** The punches of the Employees in the half-open range {@code [from, to)}, oldest first. */
    List<Punch> findByEmployeeIdInAndPunchedAtGreaterThanEqualAndPunchedAtLessThanOrderByPunchedAt(
            Collection<UUID> employeeIds, Instant from, Instant to);

    /** The latest stored punch of the company, or null when there is none. */
    @Query("select max(p.punchedAt) from Punch p")
    Instant latestPunchedAt();
}
