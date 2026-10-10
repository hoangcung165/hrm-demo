package com.hrmdemo.repository.approval;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.approval.ApprovalDelegation;
import org.springframework.data.jpa.repository.JpaRepository;

/** Ủy quyền duyệt; filtered by Legal entity (ADR 0003). */
public interface ApprovalDelegationRepository extends JpaRepository<ApprovalDelegation, UUID> {

    /** Delegations of the approver not over by the date (some may not have started yet). */
    List<ApprovalDelegation> findByDelegatorIdAndEndDateGreaterThanEqualAndEndedAtIsNull(UUID delegatorId,
            LocalDate date);

    /** Delegations to the Employee not over by the date. */
    List<ApprovalDelegation> findByDelegateIdAndEndDateGreaterThanEqualAndEndedAtIsNull(UUID delegateId,
            LocalDate date);

    List<ApprovalDelegation> findByDelegatorIdOrderByStartDateDesc(UUID delegatorId);

    List<ApprovalDelegation> findByDelegateIdOrderByStartDateDesc(UUID delegateId);
}
