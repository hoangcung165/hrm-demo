package com.hrmdemo.repository.shift;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.shift.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Phân ca of the company; queries are filtered by Legal entity (ADR 0003). */
public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, UUID> {

    List<ShiftAssignment> findByEmployeeIdInAndWorkDateBetween(Collection<UUID> employeeIds, LocalDate from,
            LocalDate to);

    /** Removes the assignments of the Employees in the range; returns how many. */
    @Modifying
    @Query("delete from ShiftAssignment a where a.employeeId in :employeeIds and a.workDate between :from and :to")
    int deleteByEmployeesBetween(@Param("employeeIds") Collection<UUID> employeeIds, @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
