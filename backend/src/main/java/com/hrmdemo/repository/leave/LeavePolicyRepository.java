package com.hrmdemo.repository.leave;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.leave.LeavePolicy;
import org.springframework.data.jpa.repository.JpaRepository;

/** Versions of the Chính sách phép; queries are filtered by Legal entity (ADR 0003). */
public interface LeavePolicyRepository extends JpaRepository<LeavePolicy, UUID> {

    List<LeavePolicy> findByLeaveTypeIdOrderByEffectiveFromAsc(UUID leaveTypeId);

    List<LeavePolicy> findByLeaveTypeIdInOrderByEffectiveFromAsc(Collection<UUID> leaveTypeIds);

    Optional<LeavePolicy> findByLeaveTypeIdAndEffectiveFrom(UUID leaveTypeId, LocalDate effectiveFrom);
}
