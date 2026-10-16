package com.hrmdemo.service.exampledata;

import static com.hrmdemo.entity.orgunit.OrgUnitType.BRANCH;
import static com.hrmdemo.entity.orgunit.OrgUnitType.DEPARTMENT;
import static com.hrmdemo.entity.orgunit.OrgUnitType.TEAM;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.legalentity.CompanyInfoRequest;
import com.hrmdemo.dto.orgunit.OrgUnitCreateRequest;
import com.hrmdemo.entity.catalog.Catalog;
import com.hrmdemo.entity.orgunit.OrgUnitType;
import com.hrmdemo.service.auth.AccountAdminService;
import com.hrmdemo.service.catalog.CatalogService;
import com.hrmdemo.service.employee.EmployeeService;
import com.hrmdemo.service.exampledata.ExampleEmployees.ExampleEmployee;
import com.hrmdemo.service.legalentity.LegalEntityService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fills a fresh database with a fictional company, its org tree and about 40 Employees with the unit heads set,
 * so the org and employee screens show something realistic on local and dev runs. When the demo personas exist,
 * each persona but the Admin is linked to its Employee and the example approval requests are sent
 * ({@link ExampleApprovals}) and a few Audit log records are written ({@link ExampleAuditRecords}). The example projects and their allocations follow ({@link ExampleProjects}).
 * Opt-in: the bean exists only when
 * {@code hrm.example-data.enabled} ({@code HRM_EXAMPLE_DATA}) is true. It never runs twice: once any
 * Organization unit exists it does nothing. The real demo seed (HRM-21) replaces this.
 * <p>
 * Runs after the catalog defaults (the positions) and the demo personas, which both run at order 2.
 */
@Slf4j
@Component
@Order(3)
@ConditionalOnProperty(name = "hrm.example-data.enabled", havingValue = "true")
@RequiredArgsConstructor
public class ExampleDataSeeder implements ApplicationRunner {

    static final CompanyInfoRequest COMPANY = new CompanyInfoRequest(
            "Công ty Cổ phần Công nghệ Mẫu",
            "0312345678",
            "Tầng 5, 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
            "Phạm Quốc Bảo",
            "Giám đốc");

    /** Parents come before their children; siblings are listed in display order. */
    static final List<ExampleUnit> UNITS = List.of(
            unit("PTPM", "Phòng Phát triển phần mềm", DEPARTMENT, null),
            unit("WEB", "Nhóm Web", TEAM, "PTPM"),
            unit("MOBILE", "Nhóm Mobile", TEAM, "PTPM"),
            unit("DEVOPS", "Nhóm Nền tảng và DevOps", TEAM, "PTPM"),
            unit("DATA", "Nhóm Dữ liệu", TEAM, "PTPM"),
            unit("QA", "Nhóm Kiểm thử", TEAM, "PTPM"),
            inactive("GAME", "Nhóm Game", TEAM, "PTPM"),
            unit("DVKH", "Phòng Dịch vụ khách hàng", DEPARTMENT, null),
            unit("TK", "Nhóm Triển khai", TEAM, "DVKH"),
            unit("HTKH", "Nhóm Hỗ trợ khách hàng", TEAM, "DVKH"),
            unit("KD", "Phòng Kinh doanh", DEPARTMENT, null),
            unit("KDGP", "Nhóm Kinh doanh giải pháp", TEAM, "KD"),
            unit("MKT", "Nhóm Marketing", TEAM, "KD"),
            unit("HCNS", "Phòng Hành chính - Nhân sự", DEPARTMENT, null),
            unit("TCKT", "Phòng Tài chính - Kế toán", DEPARTMENT, null),
            unit("CNDN", "Chi nhánh Đà Nẵng", BRANCH, null),
            unit("PMDN", "Phòng Phần mềm Đà Nẵng", DEPARTMENT, "CNDN"),
            unit("WEBDN", "Nhóm Web Đà Nẵng", TEAM, "PMDN"),
            unit("MOBDN", "Nhóm Mobile Đà Nẵng", TEAM, "PMDN"),
            unit("KTDN", "Phòng Kiểm thử Đà Nẵng", DEPARTMENT, "CNDN"));

    /** @param parentCode code of the parent unit, or null for a unit directly under the company */
    record ExampleUnit(String code, String name, OrgUnitType type, String parentCode, boolean active) {

        /** Without a head: the Employees come after the units, and the heads after them. */
        OrgUnitCreateRequest toRequest(UUID parentId) {
            return new OrgUnitCreateRequest(name, code, type.name(), parentId, null);
        }
    }

    private final OrgUnitService orgUnitService;
    private final LegalEntityService legalEntityService;
    private final EmployeeService employeeService;
    private final CatalogService catalogService;
    private final AccountAdminService accountAdminService;
    private final ExampleApprovals exampleApprovals;
    private final ExampleProjects exampleProjects;
    private final ExampleAuditRecords exampleAuditRecords;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // Two instances starting together: the second waits here, then sees the units of the first.
        legalEntityService.lockForStructureChange();
        if (orgUnitService.hasUnits()) {
            log.info("Example data skipped: the company already has organization units");
            return;
        }
        boolean companyInfoSet = legalEntityService.fillDefaultCompanyInfo(COMPANY);

        Map<String, UUID> idByCode = new HashMap<>();
        for (ExampleUnit unit : UNITS) {
            UUID parentId = unit.parentCode() == null ? null : idByCode.get(unit.parentCode());
            idByCode.put(unit.code(), orgUnitService.createAsSystem(unit.toRequest(parentId)).id());
        }
        // Afterwards, because an inactive unit takes no new child units.
        UNITS.stream()
                .filter(unit -> !unit.active())
                .forEach(unit -> orgUnitService.deactivateAsSystem(idByCode.get(unit.code())));
        int employees = seedEmployees(idByCode);
        log.info("Seeded example data: {} organization units, {} employees{}", UNITS.size(), employees,
                companyInfoSet ? " and company info" : "; company info was already set and is left as it is");
    }

    /**
     * The Employees, then the unit heads, then the persona links, then, with the personas linked, the example
     * approval requests. An Employee whose position is missing or inactive (the company changed the defaults) is
     * left out, and so is its head role.
     *
     * @return how many Employees were added
     */
    private int seedEmployees(Map<String, UUID> unitIdByCode) {
        if (employeeService.hasEmployees()) {
            log.info("Example employees skipped: the company already has employees");
            return 0;
        }
        Map<String, Optional<UUID>> positions = new HashMap<>();
        Map<String, UUID> idByName = new HashMap<>();
        int added = 0;
        int linked = 0;
        for (int index = 0; index < ExampleEmployees.EMPLOYEES.size(); index++) {
            ExampleEmployee example = ExampleEmployees.EMPLOYEES.get(index);
            Optional<UUID> position = positions.computeIfAbsent(example.positionCode(),
                    code -> catalogService.findItemByCode(Catalog.POSITION, code)
                            .filter(CatalogItemRef::active)
                            .map(CatalogItemRef::id));
            if (position.isEmpty()) {
                log.warn("Example employee {} skipped: no active position {}", example.fullName(),
                        example.positionCode());
                continue;
            }
            UUID unitId = example.unitCode() == null ? null : unitIdByCode.get(example.unitCode());
            UUID id = employeeService.createAsSystem(
                    ExampleEmployees.toRequest(index, example, unitId, position.get()));
            added++;
            idByName.put(example.fullName(), id);
            if (example.head()) {
                orgUnitService.assignHeadAsSystem(unitId, id);
            }
            if (example.persona() != null && accountAdminService.linkDemoPersonaAsSystem(example.persona(), id)) {
                linked++;
            }
        }
        if (linked > 0) {
            log.info("Example data: {} demo persona Accounts linked to their Employees", linked);
            log.info("Example data: {} approval requests sent", exampleApprovals.seed(idByName));
            log.info("Example data: {} audit log records", exampleAuditRecords.seed());
        }
        exampleProjects.seed(idByName, unitIdByCode);
        return added;
    }

    private static ExampleUnit unit(String code, String name, OrgUnitType type, String parentCode) {
        return new ExampleUnit(code, name, type, parentCode, true);
    }

    private static ExampleUnit inactive(String code, String name, OrgUnitType type, String parentCode) {
        return new ExampleUnit(code, name, type, parentCode, false);
    }
}
