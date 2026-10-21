package com.hrmdemo.repository.attendance;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.attendance.Punch;
import org.springframework.data.jpa.repository.JpaRepository;

/** Lần quẹt of the company; queries are filtered by Legal entity (ADR 0003). */
public interface PunchRepository extends JpaRepository<Punch, UUID> {

    /** The punches of the Employees in the half-open range {@code [from, to)}, oldest first. */
    List<Punch> findByEmployeeIdInAndPunchedAtGreaterThanEqualAndPunchedAtLessThanOrderByPunchedAt(
            Collection<UUID> employeeIds, Instant from, Instant to);
}
