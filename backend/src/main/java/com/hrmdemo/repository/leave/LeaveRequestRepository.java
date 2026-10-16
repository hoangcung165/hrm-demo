package com.hrmdemo.repository.leave;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.leave.LeaveRequestStatus;
import com.hrmdemo.entity.leave.LeaveRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Đơn nghỉ; queries are filtered by Legal entity (ADR 0003). */
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {

    /** The Employee's requests in these statuses: those that hold days, for balances and overlaps. */
    List<LeaveRequest> findByEmployeeIdAndStatusIn(UUID employeeId, Collection<LeaveRequestStatus> statuses);

    /** The Employee's requests touching the range, latest first. */
    @Query("""
            select r from LeaveRequest r
            where r.employeeId = :employeeId and r.endDate >= :from and r.startDate <= :to
            order by r.startDate desc, r.createdAt desc""")
    Page<LeaveRequest> findOfEmployeeTouching(@Param("employeeId") UUID employeeId, @Param("from") LocalDate from,
            @Param("to") LocalDate to, Pageable pageable);

    /** Every request in these statuses touching the range, of anyone (who else is off on those days). */
    @Query("""
            select r from LeaveRequest r
            where r.status in :statuses and r.endDate >= :from and r.startDate <= :to
            order by r.startDate, r.id""")
    List<LeaveRequest> findTouching(@Param("statuses") Collection<LeaveRequestStatus> statuses,
            @Param("from") LocalDate from, @Param("to") LocalDate to);

    boolean existsByLeaveTypeId(UUID leaveTypeId);
}
