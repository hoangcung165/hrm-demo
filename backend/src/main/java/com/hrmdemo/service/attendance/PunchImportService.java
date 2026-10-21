package com.hrmdemo.service.attendance;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Array;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.attendance.PunchImportError;
import com.hrmdemo.dto.attendance.PunchImportResponse;
import com.hrmdemo.dto.attendance.PunchImportSummary;
import com.hrmdemo.dto.attendance.PunchImportValidation;
import com.hrmdemo.entity.attendance.Punch;
import com.hrmdemo.entity.attendance.PunchImport;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.attendance.PunchImportRepository;
import com.hrmdemo.repository.attendance.PunchRepository;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.attendance.PunchRowCheck.Outcome;
import com.hrmdemo.service.attendance.PunchRowCheck.Valid;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Importing the Log quẹt thẻ (HRM-23): check a CSV or Excel file of Lần quẹt, then import it. Both need
 * ATTENDANCE_IMPORT; nothing is kept between the two calls, the import receives the file again and checks it again.
 * <p>
 * Importing the same punches again is safe: a punch is one row per Employee and instant (unique key) and the insert
 * skips what is there, so a second import stores nothing and reports the punches as already imported. The import is
 * all or nothing for a file with errors unless the caller chooses to leave the error rows out.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PunchImportService {

    /** Largest file: 5 MB. */
    public static final long MAX_FILE_BYTES = 5L * 1024 * 1024;
    /** Times without an offset in a file are wall-clock time of this zone. */
    static final ZoneId COMPANY_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private static final int CODE_CHUNK = 1000;
    private static final int INSERT_CHUNK = 5000;
    private static final String INSERT = """
            insert into punch (id, legal_entity_id, employee_id, punched_at, device, import_id, created_at, updated_at)
            select u.id::uuid, ?::uuid, u.employee_id::uuid, u.punched_at::timestamptz, u.device, ?::uuid,
                   ?::timestamptz, ?::timestamptz
            from unnest(?::text[], ?::text[], ?::text[], ?::text[]) as u(id, employee_id, punched_at, device)
            on conflict (employee_id, punched_at) do nothing""";

    private final EmployeeRepository employees;
    private final PunchRepository punches;
    private final PunchImportRepository imports;
    private final AccessScopeService accessScopes;
    private final AuditRecorder audit;
    private final CurrentLegalEntity legalEntity;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    /** Checks a file; nothing is written. */
    @Transactional(readOnly = true)
    public PunchImportValidation validate(CurrentAccount caller, String fileName, byte[] content) {
        AccessScope scope = requireImporter(caller);
        Outcome outcome = check(read(content), scope);
        int existing = existing(outcome.valid()).size();
        return new PunchImportValidation(fileName, checksum(content), summary(outcome, existing),
                outcome.errors().stream().limit(PunchImportValidation.MAX_ERRORS_LISTED).toList());
    }

    /**
     * Imports a file.
     *
     * @param skipInvalid leave rows with errors out; otherwise any such row means nothing is written
     * @param checksum    the checksum of the file that was checked, or null; a different file is refused
     */
    @Transactional
    public PunchImportResponse importFile(CurrentAccount caller, String fileName, byte[] content,
            boolean skipInvalid, String checksum) {
        AccessScope scope = requireImporter(caller);
        String actual = checksum(content);
        if (checksum != null && !checksum.isBlank() && !checksum.strip().equals(actual)) {
            throw new ApiException(HttpStatus.CONFLICT, "import.file_changed",
                    "The file is not the one that was checked");
        }
        Outcome outcome = check(read(content), scope);
        int invalid = outcome.errors().size();
        if (invalid > 0 && !skipInvalid) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "import.rows_invalid", "Some rows have errors")
                    .with("summary", summary(outcome, existing(outcome.valid()).size()))
                    .with("errors", outcome.errors().stream().limit(PunchImportValidation.MAX_ERRORS_LISTED).toList());
        }
        if (outcome.valid().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "import.nothing_to_import", "The file has no punch to import")
                    .with("summary", summary(outcome, 0));
        }
        Instant now = clock.instant();
        PunchImport record = imports.saveAndFlush(new PunchImport(UUID.randomUUID(), fileName, actual,
                caller.id(), outcome.rowsRead(), 0, 0, invalid, now));
        int stored = insert(outcome.valid(), record.getId(), now);
        int existing = outcome.valid().size() - stored;
        record.recordResult(stored, existing);
        imports.flush();
        log.info("Punch import {} by Account {}: {} rows, {} stored, {} already there, {} refused", record.getId(),
                caller.id(), outcome.rowsRead(), stored, existing, invalid);
        audit.record(caller, AuditRegistrations.PUNCH_IMPORT, record.getId(), AuditAction.CREATE,
                "Punch log imported: " + stored + " punches stored, " + existing + " already there, " + invalid
                        + " rows refused",
                null, auditValues(fileName, outcome, stored, existing, invalid));
        return new PunchImportResponse(record.getId(), outcome.rowsRead(), stored, existing, invalid);
    }

    /** {@code sha256:} and the hex SHA-256 of the bytes. */
    static String checksum(byte[] content) {
        try {
            return "sha256:" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    /** {@code import.file_too_large}, also for the servlet container's own upload limit (see the controller). */
    public static ApiException fileTooLarge() {
        return new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "import.file_too_large",
                "The file is larger than one import may be").with("limit", MAX_FILE_BYTES);
    }

    private AccessScope requireImporter(CurrentAccount caller) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.ATTENDANCE_IMPORT);
        return scope;
    }

    private static List<PunchRawRow> read(byte[] content) {
        if (content == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "import.file_missing", "No file was sent");
        }
        if (content.length > MAX_FILE_BYTES) {
            throw fileTooLarge();
        }
        return PunchFileReader.read(content);
    }

    private Outcome check(List<PunchRawRow> rows, AccessScope scope) {
        Set<String> codes = rows.stream().map(row -> PunchRowCheck.code(row.cell(PunchColumn.CODE)))
                .filter(Objects::nonNull).collect(Collectors.toCollection(LinkedHashSet::new));
        Map<String, PunchRowCheck.Known> known = new HashMap<>();
        List<String> all = new ArrayList<>(codes);
        for (int from = 0; from < all.size(); from += CODE_CHUNK) {
            List<String> chunk = all.subList(from, Math.min(all.size(), from + CODE_CHUNK));
            for (Employee employee : employees.findAllByCodeIn(chunk)) {
                known.put(PunchRowCheck.code(employee.getCode()), new PunchRowCheck.Known(employee.getId(),
                        scope.coversEmployee(employee.getId(), employee.getOrgUnitId())));
            }
        }
        return PunchRowCheck.check(rows, known::get, clock.instant(), COMPANY_ZONE);
    }

    /** The valid punches that are stored already, by Employee and instant. */
    private Set<String> existing(List<Valid> valid) {
        if (valid.isEmpty()) {
            return Set.of();
        }
        Set<UUID> people = valid.stream().map(Valid::employeeId).collect(Collectors.toSet());
        Instant from = valid.stream().map(Valid::punchedAt).min(Comparator.naturalOrder()).orElseThrow();
        Instant to = valid.stream().map(Valid::punchedAt).max(Comparator.naturalOrder()).orElseThrow().plusSeconds(1);
        Set<String> stored = new HashSet<>();
        List<UUID> ids = new ArrayList<>(people);
        for (int start = 0; start < ids.size(); start += CODE_CHUNK) {
            Collection<UUID> chunk = ids.subList(start, Math.min(ids.size(), start + CODE_CHUNK));
            for (Punch punch : punches
                    .findByEmployeeIdInAndPunchedAtGreaterThanEqualAndPunchedAtLessThanOrderByPunchedAt(chunk, from,
                            to)) {
                stored.add(key(punch.getEmployeeId(), punch.getPunchedAt()));
            }
        }
        Set<String> found = new HashSet<>();
        for (Valid row : valid) {
            String key = key(row.employeeId(), row.punchedAt());
            if (stored.contains(key)) {
                found.add(key);
            }
        }
        return found;
    }

    private static String key(UUID employeeId, Instant at) {
        return employeeId + "@" + at;
    }

    /** Inserts the punches in chunks, skipping those already stored; returns how many were stored. */
    private int insert(List<Valid> valid, UUID importId, Instant now) {
        UUID legalEntityId = legalEntity.id();
        int stored = 0;
        for (int from = 0; from < valid.size(); from += INSERT_CHUNK) {
            List<Valid> chunk = valid.subList(from, Math.min(valid.size(), from + INSERT_CHUNK));
            stored += jdbc.update(connection -> {
                var statement = connection.prepareStatement(INSERT);
                Timestamp stamp = Timestamp.from(now);
                statement.setObject(1, legalEntityId);
                statement.setObject(2, importId);
                statement.setTimestamp(3, stamp);
                statement.setTimestamp(4, stamp);
                statement.setArray(5, texts(connection, chunk.stream().map(row -> UUID.randomUUID().toString())));
                statement.setArray(6, texts(connection, chunk.stream().map(row -> row.employeeId().toString())));
                statement.setArray(7, texts(connection, chunk.stream().map(row -> row.punchedAt().toString())));
                statement.setArray(8, texts(connection, chunk.stream().map(Valid::device)));
                return statement;
            });
        }
        return stored;
    }

    private static Array texts(Connection connection, Stream<String> values)
            throws SQLException {
        return connection.createArrayOf("text", values.toArray(String[]::new));
    }

    private static PunchImportSummary summary(Outcome outcome, int existing) {
        List<Valid> valid = outcome.valid();
        Instant from = valid.stream().map(Valid::punchedAt).min(Comparator.naturalOrder()).orElse(null);
        Instant to = valid.stream().map(Valid::punchedAt).max(Comparator.naturalOrder()).orElse(null);
        int people = (int) valid.stream().map(Valid::employeeId).distinct().count();
        return new PunchImportSummary(outcome.rowsRead(), valid.size() - existing, existing,
                outcome.errors().size(), people, from, to);
    }

    private static Map<String, Object> auditValues(String fileName, Outcome outcome, int stored, int existing,
            int refused) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("fileName", fileName);
        values.put("rowsRead", outcome.rowsRead());
        values.put("stored", stored);
        values.put("alreadyImported", existing);
        values.put("refused", refused);
        return values;
    }
}
