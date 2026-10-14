package com.hrmdemo.service.employee;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeExportQuery;
import com.hrmdemo.dto.employee.EmployeeSpreadsheet;
import com.hrmdemo.dto.orgunit.OrgUnitOption;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.auth.AccountService;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeWorkbook.EmployeeRow;
import com.hrmdemo.service.employee.EmployeeWorkbook.ExportInfo;
import com.hrmdemo.service.employee.EmployeeWorkbook.PositionRow;
import com.hrmdemo.service.employee.EmployeeWorkbook.Reference;
import com.hrmdemo.service.employee.EmployeeWorkbook.UnitRow;
import com.hrmdemo.service.orgunit.OrgUnitService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The Excel files of Employees (HRM-07): the import template and the export of the list.
 * <p>
 * The export holds exactly the rows of the list for the same filters and data scope, all pages at once, up to
 * {@code hrm.employees.export.max-rows} (5,000). Identity numbers are masked as in the API unless the caller has
 * {@link Permission#EMPLOYEE_SENSITIVE_VIEW} or the row is its own. Dates in the file (its name, "Xuất lúc", the
 * "Danh mục" date) are in the company's time zone, {@link #COMPANY_ZONE}, whatever the server's zone.
 */
@Service
public class EmployeeExcelService {

    /** The demo company works in Vietnam; one Legal entity (ADR 0003), so one zone. */
    static final ZoneId COMPANY_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final String TEMPLATE_FILE_NAME = "mau-nhap-nhan-vien.xlsx";
    private static final String NO_FILTER = "Không lọc";

    private final EmployeeListService listService;
    private final EmployeeRepository employees;
    private final OrgUnitService orgUnitService;
    private final CatalogService catalogService;
    private final AccountService accountService;
    private final AccessScopeService accessScopes;
    private final Clock clock;
    private final int maxExportRows;

    public EmployeeExcelService(EmployeeListService listService, EmployeeRepository employees,
            OrgUnitService orgUnitService, CatalogService catalogService, AccountService accountService,
            AccessScopeService accessScopes, Clock clock,
            @Value("${hrm.employees.export.max-rows:5000}") int maxExportRows) {
        this.listService = listService;
        this.employees = employees;
        this.orgUnitService = orgUnitService;
        this.catalogService = catalogService;
        this.accountService = accountService;
        this.accessScopes = accessScopes;
        this.clock = clock;
        this.maxExportRows = maxExportRows;
    }

    /** The empty import file, with the units the caller may import into and the active positions. */
    @Transactional(readOnly = true)
    public EmployeeSpreadsheet template(CurrentAccount caller) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_EDIT);
        return new EmployeeSpreadsheet(TEMPLATE_FILE_NAME, EmployeeWorkbook.template(reference(caller, scope)), 0);
    }

    /**
     * The list for these filters as a file. More rows than the limit is refused ({@code export.too_many_rows}),
     * never cut silently.
     */
    @Transactional(readOnly = true)
    public EmployeeSpreadsheet export(CurrentAccount caller, EmployeeExportQuery query) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_VIEW);
        Page<Employee> found = listService.matching(scope, query.q(), query.orgUnitId(), query.includeSubUnits(),
                query.positionId(), query.status(), query.sort(), query.nationality(), 0, maxExportRows);
        if (found.getTotalElements() > maxExportRows) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "export.too_many_rows",
                    "The filter matches more employees than one export may hold")
                    .with("limit", maxExportRows)
                    .with("total", found.getTotalElements());
        }
        List<Employee> matched = found.getContent();

        Map<UUID, OrgUnitSummary> units = orgUnitService.summaries().stream()
                .collect(Collectors.toMap(OrgUnitSummary::id, Function.identity()));
        Map<UUID, CatalogItemRef> positions = catalogService.findItems(Catalog.POSITION,
                matched.stream().map(Employee::getPositionId).collect(Collectors.toSet()));
        EffectiveManagers managers = EffectiveManagers.of(matched, units, employees::findAllById);
        boolean sensitive = scope.has(Permission.EMPLOYEE_SENSITIVE_VIEW);

        List<EmployeeRow> rows = new ArrayList<>(matched.size());
        boolean masked = false;
        for (Employee employee : matched) {
            boolean unmasked = sensitive || employee.getId().equals(caller.employeeId());
            masked |= !unmasked && employee.getIdNumber() != null;
            rows.add(toRow(employee, unmasked, units, positions, managers));
        }

        LocalDateTime now = LocalDateTime.now(clock.withZone(COMPANY_ZONE));
        ExportInfo info = new ExportInfo(now, accountService.account(caller, caller.id()).fullName(),
                filters(query, units, positions), rows.size(), masked);
        byte[] content = EmployeeWorkbook.export(reference(caller, scope), rows, info);
        return new EmployeeSpreadsheet("nhan-vien-" + now.toLocalDate() + ".xlsx", content, rows.size());
    }

    private EmployeeRow toRow(Employee employee, boolean unmasked, Map<UUID, OrgUnitSummary> units,
            Map<UUID, CatalogItemRef> positions, EffectiveManagers managers) {
        OrgUnitSummary unit = employee.getOrgUnitId() == null ? null : units.get(employee.getOrgUnitId());
        CatalogItemRef position = positions.get(employee.getPositionId());
        Employee manager = managers.of(employee).orElse(null);
        // Only a manager HR chose goes in "Mã NV quản lý", so a re-import keeps following the unit head.
        String managerCode = employee.getManagerId() != null && manager != null ? manager.getCode() : null;
        return new EmployeeRow(employee.getCode(), employee.getFullName(), employee.getDateOfBirth(),
                employee.getGender(), shown(employee.getIdNumber(), unmasked), employee.getIdIssueDate(),
                employee.getIdIssuePlace(), shown(employee.getTaxCode(), unmasked),
                shown(employee.getSocialInsuranceNumber(), unmasked), employee.getPhone(),
                employee.getPersonalEmail(), employee.getAddress(), unit == null ? null : unit.code(),
                position == null ? null : position.code(), managerCode, employee.getHireDate(),
                employee.getStatus(), unit == null ? null : unit.name(), position == null ? null : position.name(),
                manager == null ? null : manager.getFullName() + " (" + manager.getCode() + ")");
    }

    private static String shown(String number, boolean unmasked) {
        return unmasked ? number : SensitiveNumbers.mask(number);
    }

    /**
     * "Danh mục": the active units the caller's scope covers, in tree order, and the active positions. The
     * Danh mục date is today in the company's zone.
     */
    private Reference reference(CurrentAccount caller, AccessScope scope) {
        List<OrgUnitOption> tree = orgUnitService.options(caller).items();
        Map<UUID, String> names = tree.stream().collect(Collectors.toMap(OrgUnitOption::id, OrgUnitOption::name));
        List<UnitRow> units = tree.stream()
                .filter(unit -> unit.active() && scope.coversOrgUnit(unit.id()))
                .map(unit -> new UnitRow(unit.code(), unit.name(),
                        unit.parentId() == null ? null : names.get(unit.parentId())))
                .toList();
        List<PositionRow> positions = catalogService.activeItems(Catalog.POSITION).stream()
                .map(item -> new PositionRow(item.code(), item.name()))
                .toList();
        return new Reference(LocalDate.now(clock.withZone(COMPANY_ZONE)), units, positions);
    }

    /** The filters in one line, as the list's filter chip reads them; "Không lọc" without any. */
    private String filters(EmployeeExportQuery query, Map<UUID, OrgUnitSummary> units,
            Map<UUID, CatalogItemRef> positions) {
        List<String> parts = new ArrayList<>();
        if (query.q() != null && !query.q().isBlank()) {
            parts.add("Tìm “" + query.q().strip() + "”");
        }
        if (query.orgUnitId() != null) {
            OrgUnitSummary unit = units.get(query.orgUnitId());
            String name = unit == null ? "Đơn vị không còn" : unit.name();
            parts.add(query.includeSubUnits() ? name + " (gồm đơn vị con)" : name);
        }
        if (query.positionId() != null) {
            CatalogItemRef position = positions.containsKey(query.positionId()) ? positions.get(query.positionId())
                    : catalogService.findItem(Catalog.POSITION, query.positionId()).orElse(null);
            parts.add(position == null ? "Chức danh không còn" : position.name());
        }
        List<EmployeeStatus> statuses = EmployeeListService.statuses(query.status(),
                EnumSet.noneOf(EmployeeStatus.class)).stream().sorted().toList();
        if (!statuses.isEmpty() && statuses.size() < EmployeeStatus.values().length) {
            parts.add(statuses.stream().map(EmployeeColumn::statusLabel).collect(Collectors.joining(", ")));
        }
        return parts.isEmpty() ? NO_FILTER : String.join(" · ", parts);
    }
}
