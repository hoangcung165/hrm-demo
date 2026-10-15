package com.hrmdemo.repository.audit;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.entity.audit.AuditLog;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

/** Filters of the Audit log list. The Legal entity filter is added by Hibernate. */
public final class AuditLogSpecifications {

    private AuditLogSpecifications() {
    }

    /**
     * Records that pass every given filter; a null filter is left out.
     *
     * @param entityType     records of this kind
     * @param entityId       records about this one record
     * @param actorId        records made by this Account
     * @param fromInclusive  records at or after this moment
     * @param toExclusive    records before this moment
     * @param searchPattern  LIKE pattern, {@code \} as the escape character, matched case-insensitively against the
     *                       summary and the name of the person
     */
    public static Specification<AuditLog> matching(String entityType, UUID entityId, UUID actorId,
            Instant fromInclusive, Instant toExclusive, String searchPattern) {
        return (root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            if (entityType != null) {
                filters.add(cb.equal(root.get("entityType"), entityType));
            }
            if (entityId != null) {
                filters.add(cb.equal(root.get("entityId"), entityId));
            }
            if (actorId != null) {
                filters.add(cb.equal(root.get("actorId"), actorId));
            }
            if (fromInclusive != null) {
                filters.add(cb.greaterThanOrEqualTo(root.<Instant>get("occurredAt"), fromInclusive));
            }
            if (toExclusive != null) {
                filters.add(cb.lessThan(root.<Instant>get("occurredAt"), toExclusive));
            }
            if (searchPattern != null) {
                filters.add(cb.or(
                        cb.like(cb.lower(root.<String>get("summary")), searchPattern, '\\'),
                        cb.like(cb.lower(root.<String>get("actorName")), searchPattern, '\\')));
            }
            return cb.and(filters.toArray(Predicate[]::new));
        };
    }
}
