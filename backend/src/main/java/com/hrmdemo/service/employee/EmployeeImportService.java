package com.hrmdemo.service.employee;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeImportResponse;
import com.hrmdemo.dto.employee.EmployeeImportValidation;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeCodeCounter;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeImportCheck.Lookups;
import com.hrmdemo.service.employee.EmployeeImportCheck.Outcome;
import com.hrmdemo.service.employee.EmployeeImportCheck.RowOutcome;
import com.hrmdemo.service.employee.EmployeeSheetReader.SheetRow;
import com.hrmdemo.service.orgunit.OrgUnitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Adding Employees from an Excel file (HRM-07): check a file, then import it. Both need EMPLOYEE_EDIT. Nothing is
 * kept between the two calls: the import receives the file again and checks it again.
 * <p>
 * The import runs under the employee code lock (the one every create takes), checks the file against the database
 * as it is then, and writes every new Employee in one transaction: all or nothing, codes in row order. Existing
 * Employees ("Đã có") are never changed.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeImportService {

    /** Largest file: 5 MB. */
    public static final long MAX_FILE_BYTES = 5L * 1024 * 1024;

    private final EmployeeRepository employees;
    private final EmployeeCodes codes;
    private final OrgUnitService orgUnitService;
    private final CatalogService catalogService;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    /** Checks a file; nothing is written. */
    @Transactional(readOnly = true)
    public EmployeeImportValidation validate(CurrentAccount caller, String fileName, byte[] content) {
        AccessScope scope = requireEditor(caller);
        List<SheetRow> rows = read(content);
        Outcome outcome = check(rows, scope);
        return validation(fileName, content, outcome);
    }

    /**
     * Imports a file.
     *
     * @param skipInvalid leave rows with errors out; otherwise any such row means nothing is written
     * @param checksum    the checksum of the file that was checked, or null; a different file is refused
     */
    @Transactional
    public EmployeeImportResponse importFile(CurrentAccount caller, String fileName, byte[] content,
            boolean skipInvalid, String checksum) {
        AccessScope scope = requireEditor(caller);
        if (checksum != null && !checksum.isBlank() && !checksum.strip().equals(checksum(content))) {
            throw new ApiException(HttpStatus.CONFLICT, "import.file_changed",
                    "The file is not the one that was checked");
        }
        List<SheetRow> rows = read(content);

        // Every create queues here, so nothing can take a number or a code between the check and the write.
        EmployeeCodeCounter counter = codes.lock();
        Outcome outcome = check(rows, scope);
        int invalid = outcome.summary().errorRows();
        if (invalid > 0 && !skipInvalid) {
            EmployeeImportValidation result = validation(fileName, content, outcome);
            throw new ApiException(HttpStatus.BAD_REQUEST, "import.rows_invalid", "Some rows have errors")
                    .with("summary", result.summary())
                    .with("errors", result.errors())
                    .with("rows", result.rows());
        }
        List<RowOutcome> valid = outcome.valid();
        if (valid.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "import.nothing_to_import", "The file has no new employee")
                    .with("summary", outcome.summary());
        }

        List<String> issued = codes.issue(counter, valid.size());
        Instant now = clock.instant();
        List<Employee> created = new ArrayList<>(valid.size());
        for (int i = 0; i < valid.size(); i++) {
            EmployeeFieldRules.Checked fields = valid.get(i).fields();
            created.add(new Employee(issued.get(i), fields.personal(), fields.identity(), fields.job(), now));
        }
        List<Employee> saved = employees.saveAll(created);
        employees.flush();
        log.info("Import by Account {}: {} employees created ({} – {}), {} existing, {} invalid skipped",
                caller.id(), saved.size(), issued.getFirst(), issued.getLast(), outcome.summary().existingRows(),
                invalid);

        List<EmployeeImportResponse.Created> result = new ArrayList<>(saved.size());
        for (int i = 0; i < saved.size(); i++) {
            Employee employee = saved.get(i);
            result.add(new EmployeeImportResponse.Created(valid.get(i).source().row(), employee.getId(),
                    employee.getCode(), employee.getFullName()));
        }
        return new EmployeeImportResponse(saved.size(), outcome.summary().existingRows(), invalid, result);
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

    private AccessScope requireEditor(CurrentAccount caller) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_EDIT);
        return scope;
    }

    private static List<SheetRow> read(byte[] content) {
        if (content == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "import.file_missing", "No file was sent");
        }
        if (content.length > MAX_FILE_BYTES) {
            throw fileTooLarge();
        }
        return EmployeeSheetReader.read(content);
    }

    private Outcome check(List<SheetRow> rows, AccessScope scope) {
        EmployeeImportCheck.Keys keys = EmployeeImportCheck.keys(rows);
        Map<String, OrgUnitSummary> units = new HashMap<>();
        orgUnitService.summaries().forEach(unit -> units.put(EmployeeImportCheck.code(unit.code()), unit));
        Map<String, CatalogItemRef> positions = new HashMap<>();
        for (CatalogItemRef item : catalogService.allItems(Catalog.POSITION)) {
            if (item.code() != null) {
                positions.put(EmployeeImportCheck.code(item.code()), item);
            }
        }
        Lookups lookups = new Lookups(units, positions,
                byKey(keys.codes(), employees::findAllByCodeIn, Employee::getCode),
                byKey(keys.idNumbers(), employees::findAllByIdNumberIn, Employee::getIdNumber),
                byKey(keys.taxCodes(), employees::findAllByTaxCodeIn, Employee::getTaxCode),
                byKey(keys.socialInsuranceNumbers(), employees::findAllBySocialInsuranceNumberIn,
                        Employee::getSocialInsuranceNumber));
        return EmployeeImportCheck.check(rows, lookups, scope, scope.has(Permission.EMPLOYEE_SENSITIVE_VIEW),
                LocalDate.now(clock));
    }

    /** One query for all the values (a file has at most 1,000 rows, so at most 2,000 values). */
    private static Map<String, Employee> byKey(Set<String> values,
            Function<Collection<String>, List<Employee>> load, Function<Employee, String> key) {
        Map<String, Employee> found = new HashMap<>();
        if (!values.isEmpty()) {
            for (Employee employee : load.apply(new HashSet<>(values))) {
                found.putIfAbsent(key.apply(employee), employee);
            }
        }
        return found;
    }

    private static EmployeeImportValidation validation(String fileName, byte[] content, Outcome outcome) {
        return new EmployeeImportValidation(fileName, checksum(content), outcome.summary(), outcome.errors(),
                outcome.rows().stream().map(RowOutcome::row).toList());
    }
}
