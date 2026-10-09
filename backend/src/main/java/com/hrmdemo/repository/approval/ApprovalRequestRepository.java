package com.hrmdemo.repository.approval;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.approval.ApprovalRequest;
import org.springframework.data.jpa.repository.JpaRepository;

/** Approval requests; queries are filtered by Legal entity (ADR 0003). The inbox lists come with HRM-12/BE-8. */
public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, UUID> {

    /** Waiting levels whose auto-approve time has come, for the background job (HRM-12/BE-6). */
    List<ApprovalRequest> findByStatusAndAutoApproveDueAtLessThanEqual(String status, Instant now);
}
