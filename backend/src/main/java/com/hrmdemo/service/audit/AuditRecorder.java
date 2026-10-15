package com.hrmdemo.service.audit;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.audit.AuditLog;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.repository.audit.AuditLogRepository;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.security.CurrentAccount;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Writes Audit log records. Call it from the service method that changes a registered record, passing the values
 * before and after; it keeps only the audited fields, drops the unchanged ones on an UPDATE, masks the sensitive
 * ones, and writes nothing when an UPDATE changed nothing. It joins the caller's transaction, so a change that rolls
 * back leaves no record, and a record that cannot be written stops the change.
 */
@Service
@RequiredArgsConstructor
public class AuditRecorder {

    private final AuditRegistry registry;
    private final AuditLogRepository records;
    private final AccountRepository accounts;
    private final CurrentLegalEntity legalEntity;
    private final Clock clock;

    /**
     * Records a change.
     *
     * @param entityType a registered key (see {@link AuditRegistrations})
     * @param before     the values before; null for CREATE
     * @param after      the values after; null for DELETE
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(CurrentAccount actor, String entityType, UUID entityId, AuditAction action, String summary,
            Map<String, ?> before, Map<String, ?> after) {
        AuditedType type = registry.find(entityType)
                .orElseThrow(() -> new IllegalArgumentException("Not a registered audited type: " + entityType));
        Map<String, Object> from = action == AuditAction.CREATE ? null : pick(type, before);
        Map<String, Object> to = action == AuditAction.DELETE ? null : pick(type, after);
        if (action == AuditAction.UPDATE) {
            Map<String, Object> changedFrom = new LinkedHashMap<>();
            Map<String, Object> changedTo = new LinkedHashMap<>();
            for (AuditedType.Field field : type.fields()) {
                Object was = from.get(field.name());
                Object now = to.get(field.name());
                if (!Objects.equals(was, now)) {
                    changedFrom.put(field.name(), was);
                    changedTo.put(field.name(), now);
                }
            }
            if (changedFrom.isEmpty()) {
                return;
            }
            from = changedFrom;
            to = changedTo;
        }
        records.save(new AuditLog(clock.instant(), actor == null ? null : actor.id(), nameOf(actor), action,
                type.key(), entityId, summary, mask(type, from), mask(type, to)));
    }

    /** {@link #record} for a record that exists once per Pháp nhân: its id is the Legal entity id. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordCompanyWide(CurrentAccount actor, String entityType, AuditAction action, String summary,
            Map<String, ?> before, Map<String, ?> after) {
        record(actor, entityType, legalEntity.id(), action, summary, before, after);
    }

    /** The audited fields of {@code values}, in the order they were registered. */
    private static Map<String, Object> pick(AuditedType type, Map<String, ?> values) {
        Map<String, Object> picked = new LinkedHashMap<>();
        for (AuditedType.Field field : type.fields()) {
            if (values != null && values.containsKey(field.name())) {
                picked.put(field.name(), values.get(field.name()));
            }
        }
        return picked;
    }

    private static Map<String, Object> mask(AuditedType type, Map<String, Object> values) {
        if (values == null) {
            return null;
        }
        Map<String, Object> masked = new LinkedHashMap<>(values);
        for (AuditedType.Field field : type.fields()) {
            if (field.masked() && masked.get(field.name()) != null) {
                masked.put(field.name(), AuditedType.MASK);
            }
        }
        return masked;
    }

    private String nameOf(CurrentAccount actor) {
        return actor == null ? null : accounts.findById(actor.id()).map(Account::getFullName).orElse(null);
    }
}
