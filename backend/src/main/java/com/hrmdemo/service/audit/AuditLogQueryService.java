package com.hrmdemo.service.audit;

import java.time.Clock;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.audit.AuditEntityTypeResponse;
import com.hrmdemo.dto.audit.AuditLogListItem;
import com.hrmdemo.dto.audit.AuditLogQuery;
import com.hrmdemo.dto.audit.AuditLogResponse;
import com.hrmdemo.entity.audit.AuditLog;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.audit.AuditLogRepository;
import com.hrmdemo.repository.audit.AuditLogSpecifications;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reading the Audit log (HRM-13/BE-2). Read only, and only with {@code AUDIT_VIEW}. The list is newest first with the
 * record id as the tie-break, so a page boundary never repeats or skips a record.
 */
@Service
@RequiredArgsConstructor
public class AuditLogQueryService {

    static final int MAX_PAGE_SIZE = 100;
    static final int MAX_SEARCH_LENGTH = 100;

    private final AuditLogRepository records;
    private final AuditRegistry registry;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    @Transactional(readOnly = true)
    public PageResponse<AuditLogListItem> list(CurrentAccount caller, AuditLogQuery query) {
        accessScopes.scopeOf(caller).require(Permission.AUDIT_VIEW);
        if (query.page() < 0) {
            throw invalidParameter("page");
        }
        if (query.size() < 1 || query.size() > MAX_PAGE_SIZE) {
            throw invalidParameter("size");
        }
        if (query.from() != null && query.to() != null && query.to().isBefore(query.from())) {
            throw invalidParameter("to");
        }
        String search = search(query.q());
        ZoneId zone = clock.getZone();
        Page<AuditLog> page = records.findAll(
                AuditLogSpecifications.matching(blankToNull(query.entityType()), query.entityId(), query.actorId(),
                        query.from() == null ? null : query.from().atStartOfDay(zone).toInstant(),
                        query.to() == null ? null : query.to().plusDays(1).atStartOfDay(zone).toInstant(), search),
                PageRequest.of(query.page(), query.size(),
                        Sort.by(Sort.Direction.DESC, "occurredAt").and(Sort.by(Sort.Direction.DESC, "id"))));
        return PageResponse.of(page, this::item);
    }

    @Transactional(readOnly = true)
    public AuditLogResponse get(CurrentAccount caller, UUID id) {
        accessScopes.scopeOf(caller).require(Permission.AUDIT_VIEW);
        AuditLog record = records.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                "audit_log.not_found", "No such audit record"));
        return new AuditLogResponse(record.getId(), record.getOccurredAt(), record.getActorId(),
                record.getActorName(), record.getAction().name(), record.getEntityType(),
                label(record.getEntityType()), record.getEntityId(), record.getSummary(), record.getBeforeValues(),
                record.getAfterValues());
    }

    /** The kinds of record that are audited, in registration order. */
    @Transactional(readOnly = true)
    public List<AuditEntityTypeResponse> entityTypes(CurrentAccount caller) {
        accessScopes.scopeOf(caller).require(Permission.AUDIT_VIEW);
        return registry.all().stream().map(type -> new AuditEntityTypeResponse(type.key(), type.label())).toList();
    }

    private AuditLogListItem item(AuditLog record) {
        return new AuditLogListItem(record.getId(), record.getOccurredAt(), record.getActorId(),
                record.getActorName(), record.getAction().name(), record.getEntityType(),
                label(record.getEntityType()), record.getEntityId(), record.getSummary());
    }

    /** The label of a registered kind; a kind that is no longer registered keeps its key. */
    private String label(String entityType) {
        return registry.find(entityType).map(AuditedType::label).orElse(entityType);
    }

    private static String search(String q) {
        String term = blankToNull(q);
        if (term == null) {
            return null;
        }
        if (term.length() > MAX_SEARCH_LENGTH) {
            throw invalidParameter("q");
        }
        return containsPattern(term);
    }

    /** Lower case, matched against the lower-cased summary and name; accents are kept. */
    private static String containsPattern(String term) {
        String escaped = term.trim().toLowerCase(java.util.Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static ApiException invalidParameter(String field) {
        return new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request value is invalid: " + field)
                .with("errors", List.of(Map.of("field", field, "code", "invalid")));
    }
}
