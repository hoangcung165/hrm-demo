package com.hrmdemo.controller.audit;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.audit.AuditActorResponse;
import com.hrmdemo.dto.audit.AuditEntityTypeResponse;
import com.hrmdemo.dto.audit.AuditLogListItem;
import com.hrmdemo.dto.audit.AuditLogQuery;
import com.hrmdemo.dto.audit.AuditLogResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.audit.AuditLogQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The Audit log, read only: there is deliberately no POST, PUT, PATCH or DELETE. Every endpoint needs
 * {@code AUDIT_VIEW}.
 */
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogQueryService auditLogs;

    @GetMapping
    @Operation(summary = "One page of audit records, newest first; the filters apply together")
    PageResponse<AuditLogListItem> list(
            @Parameter(hidden = true) CurrentAccount caller,
            @Parameter(description = "Page number, from 0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Rows per page, 1 to 100") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Kind of record, a key from /entity-types")
            @RequestParam(required = false) String entityType,
            @Parameter(description = "One record, by its id") @RequestParam(required = false) UUID entityId,
            @Parameter(description = "The Account that made the change") @RequestParam(required = false) UUID actorId,
            @Parameter(description = "First day (yyyy-MM-dd), company time, inclusive")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "Last day (yyyy-MM-dd), company time, inclusive")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "Part of the summary or of the person's name; case does not matter")
            @RequestParam(required = false) String q) {
        return auditLogs.list(caller, new AuditLogQuery(page, size, entityType, entityId, actorId, from, to, q));
    }

    @GetMapping("/entity-types")
    @Operation(summary = "The kinds of record that are audited, for the filter")
    List<AuditEntityTypeResponse> entityTypes(@Parameter(hidden = true) CurrentAccount caller) {
        return auditLogs.entityTypes(caller);
    }

    @GetMapping("/actors")
    @Operation(summary = "The people who appear in the log, by name, for the person filter")
    List<AuditActorResponse> actors(@Parameter(hidden = true) CurrentAccount caller) {
        return auditLogs.actors(caller);
    }

    @GetMapping("/{id}")
    @Operation(summary = "One audit record with the values before and after")
    AuditLogResponse get(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return auditLogs.get(caller, id);
    }
}
