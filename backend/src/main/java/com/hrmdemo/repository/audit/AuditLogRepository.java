package com.hrmdemo.repository.audit;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.entity.audit.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

/**
 * Audit log records; queries are filtered by Legal entity (ADR 0003). Deliberately not a {@code JpaRepository}: it
 * offers saving a new record and reading, and no update or delete method exists to call by mistake.
 */
public interface AuditLogRepository extends Repository<AuditLog, UUID> {

    AuditLog save(AuditLog record);

    Optional<AuditLog> findById(UUID id);

    /** One page of records that pass the filters (read only; see {@link AuditLogSpecifications}). */
    Page<AuditLog> findAll(Specification<AuditLog> filters, Pageable pageable);

    /** Every Account that appears in the log once, by name; records without an Account are left out. */
    @Query("""
            select a.actorId as id, max(a.actorName) as name from AuditLog a
            where a.actorId is not null
            group by a.actorId
            order by max(a.actorName), a.actorId""")
    List<AuditActor> findActors();

    long count();
}
