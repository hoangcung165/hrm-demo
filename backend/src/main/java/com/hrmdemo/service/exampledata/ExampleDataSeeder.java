package com.hrmdemo.service.exampledata;

import static com.hrmdemo.entity.orgunit.OrgUnitType.BRANCH;
import static com.hrmdemo.entity.orgunit.OrgUnitType.DEPARTMENT;
import static com.hrmdemo.entity.orgunit.OrgUnitType.TEAM;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.legalentity.CompanyInfoRequest;
import com.hrmdemo.dto.orgunit.OrgUnitCreateRequest;
import com.hrmdemo.entity.orgunit.OrgUnitType;
import com.hrmdemo.service.legalentity.LegalEntityService;
import com.hrmdemo.service.orgunit.OrgUnitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fills a fresh database with a fictional company and its org tree, so the org screens show something
 * realistic on local and dev runs. Opt-in: the bean exists only when {@code hrm.example-data.enabled}
 * ({@code HRM_EXAMPLE_DATA}) is true. It never runs twice: once any Organization unit exists it does nothing.
 * The real demo seed (HRM-21) replaces this.
 */
@Slf4j
@Component
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

        /** Heads stay empty: Employees arrive with HRM-06. */
        OrgUnitCreateRequest toRequest(UUID parentId) {
            return new OrgUnitCreateRequest(name, code, type.name(), parentId, null);
        }
    }

    private final OrgUnitService orgUnitService;
    private final LegalEntityService legalEntityService;

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
        log.info("Seeded example data: {} organization units{}", UNITS.size(),
                companyInfoSet ? " and company info" : "; company info was already set and is left as it is");
    }

    private static ExampleUnit unit(String code, String name, OrgUnitType type, String parentCode) {
        return new ExampleUnit(code, name, type, parentCode, true);
    }

    private static ExampleUnit inactive(String code, String name, OrgUnitType type, String parentCode) {
        return new ExampleUnit(code, name, type, parentCode, false);
    }
}
