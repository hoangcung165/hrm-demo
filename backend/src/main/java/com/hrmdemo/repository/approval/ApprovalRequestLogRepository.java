package com.hrmdemo.repository.approval;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.approval.ApprovalRequestLogEntry;
import org.springframework.data.jpa.repository.JpaRepository;

/** The Nhật ký of approval requests; filtered by Legal entity (ADR 0003). */
public interface ApprovalRequestLogRepository extends JpaRepository<ApprovalRequestLogEntry, UUID> {

    List<ApprovalRequestLogEntry> findByRequestIdOrderBySeq(UUID requestId);

    List<ApprovalRequestLogEntry> findByRequestIdInAndEventIn(Collection<UUID> requestIds, Collection<String> events);

    long countByRequestId(UUID requestId);
}
