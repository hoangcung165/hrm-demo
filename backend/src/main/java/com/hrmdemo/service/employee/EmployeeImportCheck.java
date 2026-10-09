package com.hrmdemo.service.employee;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeCreateRequest;
import com.hrmdemo.dto.employee.EmployeeIdentityRequest;
import com.hrmdemo.dto.employee.EmployeeImportError;
import com.hrmdemo.dto.employee.EmployeeImportRef;
import com.hrmdemo.dto.employee.EmployeeImportRow;
import com.hrmdemo.dto.employee.EmployeeImportSummary;
import com.hrmdemo.dto.employee.EmployeeJobRequest;
import com.hrmdemo.dto.employee.EmployeePersonalRequest;
import com.hrmdemo.dto.employee.EmployeeRef;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.employee.EmployeeSheetCells.SheetCell;
import com.hrmdemo.service.employee.EmployeeSheetReader.SheetRow;

/**
 * The rules of an import, row by row, in memory: the caller loads every lookup first ({@link #keys} says which),
 * so a file of any size costs a fixed number of queries.
 * <ol>
 *   <li><b>Đã có:</b> a filled Mã nhân viên of an existing Employee, or else a Số CCCD of an existing Employee
 *       (any status). Such a row is skipped and not checked further. A Mã nhân viên of no Employee is an error:
 *       codes are never typed in.</li>
 *   <li>The cell reading errors, then the field rules of {@code POST /api/employees}
 *       ({@link EmployeeFieldRules#validate}). An empty Mã số thuế is the Số CCCD.</li>
 *   <li>References by code: unit (required, active, within the data scope), position (active), manager (an
 *       existing active Employee; a manager added by the same file is not supported, it has no code yet).</li>
 *   <li>Uniqueness inside the file (CCCD, MST, số BHXH) and against the database (MST, số BHXH).</li>
 * </ol>
 * One error per cell, the first; a row may have several.
 */
final class EmployeeImportCheck {

    static final String VALID = "VALID";
    static final String INVALID = "INVALID";
    static final String EXISTING = "EXISTING";

    private EmployeeImportCheck() {
    }

    /** What to load before the check: codes (column A and the managers) and the identity numbers. */
    record Keys(Set<String> codes, Set<String> idNumbers, Set<String> taxCodes, Set<String> socialInsuranceNumbers) {
    }

    /**
     * Everything the check reads, loaded in a few queries.
     *
     * @param units     every unit of the company, by upper-case code
     * @param positions every positions item, active or not, by upper-case code
     * @param byCode    the Employees whose code is among {@link Keys#codes()}, by code
     */
    record Lookups(Map<String, OrgUnitSummary> units, Map<String, CatalogItemRef> positions,
            Map<String, Employee> byCode, Map<String, Employee> byIdNumber, Map<String, Employee> byTaxCode,
            Map<String, Employee> bySocialInsuranceNumber) {
    }

    /**
     * One checked row.
     *
     * @param fields the fields to save, with the codes resolved to ids; only for a VALID row
     */
    record RowOutcome(SheetRow source, String status, EmployeeFieldRules.Checked fields,
            List<EmployeeImportError> errors, EmployeeImportRow row) {
    }

    /** @param errors every error of every row, by row then column */
    record Outcome(List<RowOutcome> rows, EmployeeImportSummary summary, List<EmployeeImportError> errors) {

        List<RowOutcome> valid() {
            return rows.stream().filter(row -> row.status().equals(VALID)).toList();
        }
    }

    static Keys keys(List<SheetRow> rows) {
        Set<String> codes = new LinkedHashSet<>();
        Set<String> idNumbers = new LinkedHashSet<>();
        Set<String> taxCodes = new LinkedHashSet<>();
        Set<String> socialInsuranceNumbers = new LinkedHashSet<>();
        for (SheetRow row : rows) {
            addIfPresent(codes, code(row.text(EmployeeColumn.CODE)));
            addIfPresent(codes, code(row.text(EmployeeColumn.MANAGER_CODE)));
            String idNumber = digits(row.text(EmployeeColumn.ID_NUMBER));
            addIfPresent(idNumbers, idNumber);
            addIfPresent(taxCodes, digits(row.text(EmployeeColumn.TAX_CODE)));
            // An empty MST is the CCCD, which may be someone else's MST.
            addIfPresent(taxCodes, idNumber);
            addIfPresent(socialInsuranceNumbers, digits(row.text(EmployeeColumn.SOCIAL_INSURANCE_NUMBER)));
        }
        return new Keys(codes, idNumbers, taxCodes, socialInsuranceNumbers);
    }

    /**
     * @param unmasked whether the caller may see identity numbers (EMPLOYEE_SENSITIVE_VIEW); otherwise they are
     *                 masked in the rows and the errors
     */
    static Outcome check(List<SheetRow> rows, Lookups lookups, AccessScope scope, boolean unmasked, LocalDate today) {
        List<Draft> drafts = rows.stream().map(row -> firstPass(row, lookups, scope, today)).toList();
        List<Draft> fresh = drafts.stream().filter(draft -> draft.existing == null).toList();
        duplicates(fresh, EmployeeColumn.ID_NUMBER, draft -> draft.idNumber(), true);
        duplicates(fresh, EmployeeColumn.TAX_CODE, draft -> draft.taxCode(), false);
        duplicates(fresh, EmployeeColumn.SOCIAL_INSURANCE_NUMBER, draft -> draft.socialInsuranceNumber(), true);
        for (Draft draft : fresh) {
            taken(draft, EmployeeColumn.TAX_CODE, draft.taxCode(), lookups.byTaxCode(), scope);
            taken(draft, EmployeeColumn.SOCIAL_INSURANCE_NUMBER, draft.socialInsuranceNumber(),
                    lookups.bySocialInsuranceNumber(), scope);
        }

        List<RowOutcome> outcomes = new ArrayList<>(drafts.size());
        List<EmployeeImportError> errors = new ArrayList<>();
        int valid = 0;
        int invalid = 0;
        for (Draft draft : drafts) {
            RowOutcome outcome = draft.outcome(scope, unmasked);
            outcomes.add(outcome);
            errors.addAll(outcome.errors());
            switch (outcome.status()) {
                case VALID -> valid++;
                case INVALID -> invalid++;
                default -> { }
            }
        }
        EmployeeImportSummary summary = new EmployeeImportSummary(drafts.size(), valid, invalid,
                drafts.size() - valid - invalid);
        return new Outcome(outcomes, summary, errors);
    }

    /** Đã có, the cell errors, the field rules and the references of one row. */
    private static Draft firstPass(SheetRow row, Lookups lookups, AccessScope scope, LocalDate today) {
        Draft draft = new Draft(row);
        for (Map.Entry<EmployeeColumn, SheetCell> cell : row.cells().entrySet()) {
            if (cell.getValue().error() != null) {
                draft.add(cell.getKey(), cell.getValue().error());
            }
        }

        String code = code(row.text(EmployeeColumn.CODE));
        String idNumber = digits(row.text(EmployeeColumn.ID_NUMBER));
        if (code != null) {
            Employee byCode = lookups.byCode().get(code);
            if (byCode != null) {
                return draft.existing(byCode, "CODE");
            }
            draft.add(EmployeeColumn.CODE, "not_found");
        } else if (idNumber != null && lookups.byIdNumber().containsKey(idNumber)) {
            return draft.existing(lookups.byIdNumber().get(idNumber), "ID_NUMBER");
        }

        String genderText = row.text(EmployeeColumn.GENDER);
        Gender gender = genderText == null ? null : EmployeeSheetCells.gender(genderText);
        if (genderText != null && gender == null) {
            draft.add(EmployeeColumn.GENDER, "invalid");
        }
        String statusText = row.text(EmployeeColumn.STATUS);
        EmployeeStatus status = statusText == null ? null : EmployeeSheetCells.status(statusText);
        if (statusText != null && status == null) {
            draft.add(EmployeeColumn.STATUS, "invalid");
        }
        draft.unit = unit(draft, lookups, scope);
        draft.position = position(draft, lookups);
        draft.manager = manager(draft, lookups);

        String taxCode = row.text(EmployeeColumn.TAX_CODE);
        if (taxCode == null && idNumber != null && idNumber.matches("[0-9]{12}")) {
            taxCode = idNumber;
        }
        EmployeeCreateRequest request = new EmployeeCreateRequest(row.text(EmployeeColumn.FULL_NAME),
                new EmployeePersonalRequest(row.cell(EmployeeColumn.DATE_OF_BIRTH).date(),
                        gender == null ? null : gender.name(), row.text(EmployeeColumn.PERSONAL_EMAIL),
                        row.text(EmployeeColumn.PHONE), row.text(EmployeeColumn.ADDRESS), null),
                new EmployeeIdentityRequest(row.text(EmployeeColumn.ID_NUMBER),
                        row.cell(EmployeeColumn.ID_ISSUE_DATE).date(), row.text(EmployeeColumn.ID_ISSUE_PLACE),
                        taxCode, row.text(EmployeeColumn.SOCIAL_INSURANCE_NUMBER)),
                new EmployeeJobRequest(draft.unit == null ? null : draft.unit.id(),
                        draft.position == null ? null : draft.position.id(),
                        draft.manager == null ? null : draft.manager.getId(),
                        row.cell(EmployeeColumn.HIRE_DATE).date(), status == null ? null : status.name()));
        EmployeeFieldRules.Result result = EmployeeFieldRules.validate(request, today);
        for (Map<String, String> error : result.errors()) {
            EmployeeColumn.ofField(error.get("field")).ifPresent(column -> draft.add(column, error.get("code")));
        }
        draft.fields = result.checked();
        return draft;
    }

    private static OrgUnitSummary unit(Draft draft, Lookups lookups, AccessScope scope) {
        String code = code(draft.source.text(EmployeeColumn.ORG_UNIT_CODE));
        if (code == null) {
            draft.add(EmployeeColumn.ORG_UNIT_CODE, "required");
            return null;
        }
        OrgUnitSummary unit = lookups.units().get(code);
        if (unit == null) {
            draft.add(EmployeeColumn.ORG_UNIT_CODE, "not_found");
        } else if (!unit.active()) {
            draft.add(EmployeeColumn.ORG_UNIT_CODE, "inactive");
        } else if (!scope.coversOrgUnit(unit.id())) {
            draft.add(EmployeeColumn.ORG_UNIT_CODE, "out_of_scope");
        } else {
            return unit;
        }
        return null;
    }

    private static CatalogItemRef position(Draft draft, Lookups lookups) {
        String code = code(draft.source.text(EmployeeColumn.POSITION_CODE));
        if (code == null) {
            // The field rules say "required".
            return null;
        }
        CatalogItemRef position = lookups.positions().get(code);
        if (position == null) {
            draft.add(EmployeeColumn.POSITION_CODE, "not_found");
        } else if (!position.active()) {
            draft.add(EmployeeColumn.POSITION_CODE, "inactive");
        }
        // An inactive one is still passed on, so the field rules do not add "required" on top.
        return position;
    }

    private static Employee manager(Draft draft, Lookups lookups) {
        String code = code(draft.source.text(EmployeeColumn.MANAGER_CODE));
        if (code == null) {
            return null;
        }
        Employee manager = lookups.byCode().get(code);
        if (manager == null) {
            draft.add(EmployeeColumn.MANAGER_CODE, "not_found");
            return null;
        }
        if (!manager.isActive()) {
            draft.add(EmployeeColumn.MANAGER_CODE, "inactive");
            return null;
        }
        return manager;
    }

    /**
     * Every row whose value repeats gets {@code duplicate_in_file} with the other rows.
     *
     * @param defaultedToo false for MST: an empty MST is the CCCD, whose repeat is already reported on Số CCCD
     */
    private static void duplicates(List<Draft> drafts, EmployeeColumn column, Function<Draft, String> value,
            boolean defaultedToo) {
        Map<String, List<Draft>> byValue = new LinkedHashMap<>();
        for (Draft draft : drafts) {
            String number = value.apply(draft);
            if (number != null && (defaultedToo || draft.source.text(column) != null)) {
                byValue.computeIfAbsent(number, key -> new ArrayList<>()).add(draft);
            }
        }
        for (List<Draft> same : byValue.values()) {
            if (same.size() < 2) {
                continue;
            }
            for (Draft draft : same) {
                List<Integer> others = same.stream().filter(other -> other != draft)
                        .map(other -> other.source.row()).toList();
                draft.add(column, "duplicate_in_file", others, null);
            }
        }
    }

    /** {@code taken} when another Employee holds the number; it is named only within the caller's scope. */
    private static void taken(Draft draft, EmployeeColumn column, String number, Map<String, Employee> holders,
            AccessScope scope) {
        Employee holder = number == null ? null : holders.get(number);
        if (holder != null) {
            draft.add(column, "taken", null,
                    scope.coversEmployee(holder.getId(), holder.getOrgUnitId()) ? EmployeeService.toRef(holder) : null);
        }
    }

    private static void addIfPresent(Set<String> values, String value) {
        if (value != null) {
            values.add(value);
        }
    }

    /** A code as stored (upper case), or null when blank. */
    static String code(String text) {
        return text == null ? null : text.strip().toUpperCase(Locale.ROOT);
    }

    /** A number without the spaces people put between digit groups, or null when blank. */
    static String digits(String text) {
        return text == null ? null : text.replaceAll("[\\s\\p{Z}]+", "");
    }

    /** One row while it is checked: its errors so far, first per column, and what it resolved to. */
    private static final class Draft {

        final SheetRow source;
        final Map<EmployeeColumn, Issue> issues = new EnumMap<>(EmployeeColumn.class);
        Employee existing;
        String matchedBy;
        EmployeeFieldRules.Checked fields;
        OrgUnitSummary unit;
        CatalogItemRef position;
        Employee manager;

        Draft(SheetRow source) {
            this.source = source;
        }

        record Issue(String code, List<Integer> otherRows, EmployeeRef conflict) {
        }

        Draft existing(Employee employee, String by) {
            this.existing = employee;
            this.matchedBy = by;
            this.issues.clear();
            return this;
        }

        void add(EmployeeColumn column, String code) {
            add(column, code, null, null);
        }

        void add(EmployeeColumn column, String code, List<Integer> otherRows, EmployeeRef conflict) {
            issues.putIfAbsent(column, new Issue(code, otherRows, conflict));
        }

        String idNumber() {
            return fields == null ? null : fields.identity().idNumber();
        }

        String taxCode() {
            return fields == null ? null : fields.identity().taxCode();
        }

        String socialInsuranceNumber() {
            return fields == null ? null : fields.identity().socialInsuranceNumber();
        }

        RowOutcome outcome(AccessScope scope, boolean unmasked) {
            String idNumber = EmployeeSheetCells.echo(source.text(EmployeeColumn.ID_NUMBER), EmployeeColumn.ID_NUMBER,
                    unmasked);
            if (existing != null) {
                EmployeeRef holder = scope.coversEmployee(existing.getId(), existing.getOrgUnitId())
                        ? EmployeeService.toRef(existing) : null;
                return new RowOutcome(source, EXISTING, null, List.of(), new EmployeeImportRow(source.row(), EXISTING,
                        source.text(EmployeeColumn.FULL_NAME), idNumber, matchedBy, holder, null, null, null, null,
                        null, null, null));
            }
            if (!issues.isEmpty()) {
                List<EmployeeImportError> errors = issues.entrySet().stream()
                        .sorted(Map.Entry.comparingByKey(Comparator.comparingInt(EmployeeColumn::ordinal)))
                        .map(entry -> error(entry.getKey(), entry.getValue(), unmasked))
                        .toList();
                return new RowOutcome(source, INVALID, null, errors, new EmployeeImportRow(source.row(), INVALID,
                        source.text(EmployeeColumn.FULL_NAME), idNumber, null, null, null, null, null, null, null,
                        null, null));
            }
            return new RowOutcome(source, VALID, fields, List.of(), new EmployeeImportRow(source.row(), VALID,
                    fields.personal().fullName(), idNumber, null, null, fields.personal().dateOfBirth(),
                    fields.personal().gender().name(), new EmployeeImportRef(unit.code(), unit.name()),
                    new EmployeeImportRef(position.code(), position.name()),
                    manager == null ? null : EmployeeService.toRef(manager), fields.job().hireDate(),
                    fields.job().status().name()));
        }

        private EmployeeImportError error(EmployeeColumn column, Issue issue, boolean unmasked) {
            return new EmployeeImportError(source.row(), column.letter(), column.label, column.field(), issue.code(),
                    EmployeeSheetCells.echo(source.text(column), column, unmasked), issue.otherRows(),
                    issue.conflict());
        }
    }
}
