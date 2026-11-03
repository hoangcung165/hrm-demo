package com.hrmdemo.repository.attendance;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.attendance.AttendanceAdjustmentStatus;
import com.hrmdemo.entity.attendance.AttendanceAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/** Đơn bổ sung công of the company; queries are filtered by Legal entity (ADR 0003). */
public interface AttendanceAdjustmentRepository extends JpaRepository<AttendanceAdjustment, UUID> {

    List<AttendanceAdjustment> findByEmployeeIdInAndWorkDateBetweenAndStatus(Collection<UUID> employeeIds,
            LocalDate from, LocalDate to, AttendanceAdjustmentStatus status);

    List<AttendanceAdjustment> findByEmployeeIdAndWorkDateAndStatusIn(UUID employeeId, LocalDate workDate,
            Collection<AttendanceAdjustmentStatus> statuses);

    Page<AttendanceAdjustment> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId, Pageable pageable);
}
