package com.hrmdemo.repository.approval;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.approval.ApprovalRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Approval requests and the three inbox lists. {@code type} null means every type; {@code q} null means no search,
 * otherwise a {@code SearchText.containsPattern} matched against the sender's name and code. Queries are filtered
 * by Legal entity (ADR 0003).
 */
public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, UUID> {

    /** Waiting for one of these Employees (the caller, and those who delegated to the caller), soonest due first. */
    @Query(value = """
            select r from ApprovalRequest r join Employee e on e.id = r.senderId
            where r.status = 'PENDING' and r.senderId <> :me
              and exists (select 1 from ApprovalRequest x join x.approvers a where x.id = r.id and a in :approvers)
              and (:type is null or r.requestType = :type)
              and (:q is null or e.searchText like :q escape '\\')
            order by case when r.autoApproveDueAt is null then 1 else 0 end, r.autoApproveDueAt, r.createdAt""",
            countQuery = """
            select count(r) from ApprovalRequest r join Employee e on e.id = r.senderId
            where r.status = 'PENDING' and r.senderId <> :me
              and exists (select 1 from ApprovalRequest x join x.approvers a where x.id = r.id and a in :approvers)
              and (:type is null or r.requestType = :type)
              and (:q is null or e.searchText like :q escape '\\')""")
    Page<ApprovalRequest> findWaiting(@Param("me") UUID me, @Param("approvers") Collection<UUID> approvers,
            @Param("type") String type, @Param("q") String q, Pageable pageable);

    /** Sent by the Employee, newest first. */
    @Query(value = """
            select r from ApprovalRequest r
            where r.senderId = :me and (:type is null or r.requestType = :type)
            order by r.createdAt desc""",
            countQuery = """
            select count(r) from ApprovalRequest r
            where r.senderId = :me and (:type is null or r.requestType = :type)""")
    Page<ApprovalRequest> findSent(@Param("me") UUID me, @Param("type") String type, Pageable pageable);

    /** Decided by the Employee at some level (themselves or on behalf of someone), latest change first. */
    @Query(value = """
            select r from ApprovalRequest r join Employee e on e.id = r.senderId
            where exists (select 1 from ApprovalRequestLogEntry l
                          where l.requestId = r.id and l.actorId = :me and l.event in :decisions)
              and (:type is null or r.requestType = :type)
              and (:q is null or e.searchText like :q escape '\\')
            order by r.updatedAt desc""",
            countQuery = """
            select count(r) from ApprovalRequest r join Employee e on e.id = r.senderId
            where exists (select 1 from ApprovalRequestLogEntry l
                          where l.requestId = r.id and l.actorId = :me and l.event in :decisions)
              and (:type is null or r.requestType = :type)
              and (:q is null or e.searchText like :q escape '\\')""")
    Page<ApprovalRequest> findHandled(@Param("me") UUID me, @Param("decisions") Collection<String> decisions,
            @Param("type") String type, @Param("q") String q, Pageable pageable);

    @Query("""
            select count(r) from ApprovalRequest r
            where r.status = 'PENDING' and r.senderId <> :me
              and exists (select 1 from ApprovalRequest x join x.approvers a where x.id = r.id and a in :approvers)""")
    long countWaiting(@Param("me") UUID me, @Param("approvers") Collection<UUID> approvers);

    @Query("select count(r) from ApprovalRequest r where r.senderId = :me and r.status in :statuses")
    long countSent(@Param("me") UUID me, @Param("statuses") Collection<String> statuses);

    /** Waiting levels whose auto-approve time has come, for the background job (HRM-12/BE-6). */
    List<ApprovalRequest> findByStatusAndAutoApproveDueAtLessThanEqualOrderByAutoApproveDueAt(String status,
            Instant now);
}
