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

    boolean existsByEmployeeIdAndPunchedAt(UUID employeeId, Instant punchedAt);

    /** The punches of one Employee in the half-open range {@code [from, to)}, oldest first. */
    List<Punch> findByEmployeeIdAndPunchedAtGreaterThanEqualAndPunchedAtLessThanOrderByPunchedAt(UUID employeeId,
            Instant from, Instant to);

    /** How many mobile punches each place was the nearest of since {@code since}: rows of [location id, count]. */
    @Query("""
            select p.locationId, count(p) from Punch p
            where p.locationId is not null and p.punchedAt >= :since group by p.locationId""")
    List<Object[]> countByLocationSince(Instant since);

    /**
     * The latest stored machine punch of the company (how far the Log quẹt thẻ covers), or null when there is none.
     * Mobile punches are live, so they say nothing about how far the machine log has been imported.
     */
    @Query("select max(p.punchedAt) from Punch p where p.source = com.hrmdemo.entity.attendance.PunchSource.MACHINE")
    Instant latestPunchedAt();
}
