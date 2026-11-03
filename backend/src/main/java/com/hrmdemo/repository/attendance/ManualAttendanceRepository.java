package com.hrmdemo.repository.attendance;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.attendance.ManualAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Công thủ công of the company; queries are filtered by Legal entity (ADR 0003). */
public interface ManualAttendanceRepository extends JpaRepository<ManualAttendance, UUID> {

    List<ManualAttendance> findByEmployeeIdInAndWorkDateBetween(Collection<UUID> employeeIds, LocalDate from,
            LocalDate to);

    /** Removes the entries of the Employees on the given days; returns how many. */
    @Modifying
    @Query("delete from ManualAttendance m where m.employeeId in :employeeIds and m.workDate in :days")
    int deleteByEmployeesOnDays(@Param("employeeIds") Collection<UUID> employeeIds,
            @Param("days") Collection<LocalDate> days);
}
