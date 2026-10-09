package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.catalog.CatalogItemRef;
import com.hrmdemo.dto.employee.EmployeeImportError;
import com.hrmdemo.dto.employee.EmployeeImportRef;
import com.hrmdemo.dto.employee.EmployeeImportRow;
import com.hrmdemo.dto.employee.EmployeeImportSummary;
import com.hrmdemo.dto.orgunit.OrgUnitSummary;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeIdentityFields;
import com.hrmdemo.entity.employee.EmployeeJobFields;
import com.hrmdemo.entity.employee.EmployeePersonalFields;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.employee.EmployeeImportCheck.Lookups;
import com.hrmdemo.service.employee.EmployeeImportCheck.Outcome;
import com.hrmdemo.support.ImportFiles;
import com.hrmdemo.support.ImportFiles.Person;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/** The rules of an import row by row, with every lookup in memory. */
class EmployeeImportCheckTest {

    static final LocalDate TODAY = LocalDate.of(2026, 10, 9);
    static final UUID WEB = UUID.fromString("00000000-0000-0000-0000-0000000000a1");
    static final UUID GAME = UUID.fromString("00000000-0000-0000-0000-0000000000a2");
    static final UUID SALES = UUID.fromString("00000000-0000-0000-0000-0000000000a3");
    static final UUID CV = UUID.fromString("00000000-0000-0000-0000-0000000000c1");
    static final UUID OLD = UUID.fromString("00000000-0000-0000-0000-0000000000c2");

    Employee head;
    Employee left;
    Employee seller;
    Lookups lookups;
    AccessScope hr;
    AccessScope lineManager;

    @BeforeEach
    void setUp() {
        head = employee("NV00001", "Lê Văn Hùng", WEB, "001195000001", "0101234567", "7912340000",
                EmployeeStatus.OFFICIAL);
        left = employee("NV00002", "Phạm Thu Hà", WEB, "001195000002", null, null, EmployeeStatus.INACTIVE);
        seller = employee("NV00003", "Đỗ Văn Bình", SALES, "001195000003", "0109999999", null,
                EmployeeStatus.OFFICIAL);
        Map<String, Employee> byCode = new HashMap<>();
        Map<String, Employee> byIdNumber = new HashMap<>();
        Map<String, Employee> byTaxCode = new HashMap<>();
        Map<String, Employee> byInsurance = new HashMap<>();
        for (Employee employee : List.of(head, left, seller)) {
            byCode.put(employee.getCode(), employee);
            byIdNumber.put(employee.getIdNumber(), employee);
            if (employee.getTaxCode() != null) {
                byTaxCode.put(employee.getTaxCode(), employee);
            }
            if (employee.getSocialInsuranceNumber() != null) {
                byInsurance.put(employee.getSocialInsuranceNumber(), employee);
            }
        }
        lookups = new Lookups(
                Map.of("WEB", new OrgUnitSummary(WEB, null, "WEB", "Nhóm Web", true, head.getId()),
                        "GAME", new OrgUnitSummary(GAME, null, "GAME", "Nhóm Game", false, null),
                        "KD", new OrgUnitSummary(SALES, null, "KD", "Phòng Kinh doanh", true, null)),
                Map.of("CV", new CatalogItemRef(CV, "CV", "Chuyên viên", true),
                        "OLD", new CatalogItemRef(OLD, "OLD", "Chức danh cũ", false)),
                byCode, byIdNumber, byTaxCode, byInsurance);
        AccessScopeService scopes = new AccessScopeService(
                employeeId -> employeeId.equals(head.getId()) ? Set.of(WEB) : Set.of());
        hr = scopes.scopeOf(new CurrentAccount(UUID.randomUUID(), null, Set.of("HR")));
        lineManager = scopes.scopeOf(new CurrentAccount(UUID.randomUUID(), head.getId(), Set.of("LINE_MANAGER")));
    }

    @Test
    void aCompleteRowIsValidWithAPreviewAndAnEmptyTaxCodeIsTheCccd() {
        Outcome outcome = check(hr, true, person("Trần Thị Mai", "079194005678").set("Mã NV quản lý", "nv00001")
                .set("Trạng thái", "chính thức"));

        EmployeeImportRow row = outcome.rows().getFirst().row();
        assertThat(outcome.summary()).isEqualTo(new EmployeeImportSummary(1, 1, 0, 0));
        assertThat(outcome.errors()).isEmpty();
        assertThat(row.status()).isEqualTo("VALID");
        assertThat(row.row()).isEqualTo(2);
        assertThat(row.gender()).isEqualTo("FEMALE");
        assertThat(row.orgUnit()).isEqualTo(new EmployeeImportRef("WEB", "Nhóm Web"));
        assertThat(row.position()).isEqualTo(new EmployeeImportRef("CV", "Chuyên viên"));
        assertThat(row.manager().code()).isEqualTo("NV00001");
        assertThat(row.employeeStatus()).isEqualTo("OFFICIAL");
        EmployeeFieldRules.Checked fields = outcome.rows().getFirst().fields();
        assertThat(fields.identity().taxCode()).isEqualTo("079194005678");
        assertThat(fields.job().orgUnitId()).isEqualTo(WEB);
        assertThat(fields.job().positionId()).isEqualTo(CV);
        assertThat(fields.job().managerId()).isEqualTo(head.getId());
    }

    @Test
    void anEmptyStatusIsProbationAndNoManagerFollowsTheUnitHead() {
        EmployeeImportRow row = check(hr, true, person("Trần Thị Mai", "079194005678")).rows().getFirst().row();

        assertThat(row.employeeStatus()).isEqualTo("PROBATION");
        assertThat(row.manager()).isNull();
    }

    @Test
    void aKnownCodeOrElseAKnownCccdIsAlreadyThereAndNotCheckedFurther() {
        Outcome outcome = check(hr, true,
                // An export row: code filled, CCCD masked, nothing else checked.
                new Person().set("Mã nhân viên", "NV00001").set("Số CCCD *", "••••••••0001"),
                person("Phạm Thu Hà", "001195000002").set("Ngày sinh *", "không rõ"));

        assertThat(outcome.summary()).isEqualTo(new EmployeeImportSummary(2, 0, 0, 2));
        assertThat(outcome.errors()).isEmpty();
        EmployeeImportRow byCode = outcome.rows().get(0).row();
        assertThat(byCode.status()).isEqualTo("EXISTING");
        assertThat(byCode.matchedBy()).isEqualTo("CODE");
        assertThat(byCode.existing().code()).isEqualTo("NV00001");
        EmployeeImportRow byIdNumber = outcome.rows().get(1).row();
        assertThat(byIdNumber.matchedBy()).as("an Employee who left matches too").isEqualTo("ID_NUMBER");
        assertThat(byIdNumber.existing().fullName()).isEqualTo("Phạm Thu Hà");
    }

    @Test
    void anExistingEmployeeOutsideTheScopeIsNotNamed() {
        EmployeeImportRow row = check(lineManager, true, person("Đỗ Văn Bình", "001195000003")).rows().getFirst()
                .row();

        assertThat(row.status()).isEqualTo("EXISTING");
        assertThat(row.existing()).isNull();
    }

    @Test
    void aCodeOfNoEmployeeIsAnErrorBecauseCodesAreNeverTypedIn() {
        Outcome outcome = check(hr, true, person("Trần Thị Mai", "079194005678").set("Mã nhân viên", "NV12345"));

        assertThat(errors(outcome)).containsExactly("2 A code not_found NV12345");
    }

    @Test
    void theUnitIsRequiredKnownActiveAndWithinTheScope() {
        Outcome outcome = check(lineManager, true,
                person("A", "079194000001").set("Mã đơn vị *", null),
                person("B", "079194000002").set("Mã đơn vị *", "XYZ"),
                person("C", "079194000003").set("Mã đơn vị *", "game"),
                person("D", "079194000004").set("Mã đơn vị *", "KD"),
                person("E", "079194000005"));

        assertThat(errors(outcome)).containsExactly(
                "2 M job.orgUnitId required null",
                "3 M job.orgUnitId not_found XYZ",
                "4 M job.orgUnitId inactive game",
                "5 M job.orgUnitId out_of_scope KD");
        assertThat(outcome.rows().get(4).status()).isEqualTo("VALID");
    }

    @Test
    void thePositionAndTheManagerAreFoundByCode() {
        Outcome outcome = check(hr, true,
                person("A", "079194000001").set("Mã chức danh *", null),
                person("B", "079194000002").set("Mã chức danh *", "NOPE"),
                person("C", "079194000003").set("Mã chức danh *", "OLD"),
                person("D", "079194000004").set("Mã NV quản lý", "NV00002"),
                person("E", "079194000005").set("Mã NV quản lý", "NV99999"));

        assertThat(errors(outcome)).containsExactly(
                "2 N job.positionId required null",
                "3 N job.positionId not_found NOPE",
                "4 N job.positionId inactive OLD",
                "5 O job.managerId inactive NV00002",
                "6 O job.managerId not_found NV99999");
    }

    @Test
    void theFieldRulesOfCreateApplyAndEveryFailingCellOfARowIsListedInColumnOrder() {
        Outcome outcome = check(hr, true, person("Trần Thị Mai", "07919400567")
                .set("Giới tính *", "khác")
                .set("Ngày sinh *", "31/02/1990")
                .set("Mã số thuế", "001195000099")
                .set("Số điện thoại", "12345")
                .set("Trạng thái", "Đã nghỉ việc"),
                person("Lê Bé", "079194000002").set("Ngày sinh *", LocalDate.of(2015, 1, 1)));

        assertThat(errors(outcome)).containsExactly(
                "2 C personal.dateOfBirth invalid 31/02/1990",
                "2 D personal.gender invalid khác",
                "2 E identity.idNumber invalid 07919400567",
                "2 J personal.phone invalid 12345",
                "2 Q job.status invalid Đã nghỉ việc",
                "3 C personal.dateOfBirth under_age 01/01/2015");
        EmployeeImportError first = outcome.errors().getFirst();
        assertThat(first.header()).isEqualTo("Ngày sinh");
        assertThat(outcome.summary()).isEqualTo(new EmployeeImportSummary(2, 0, 2, 0));
        assertThat(outcome.rows().getFirst().row().fullName()).isEqualTo("Trần Thị Mai");
    }

    @Test
    void aTwelveDigitTaxCodeMustBeTheCccd() {
        Outcome outcome = check(hr, true, person("A", "079194000001").set("Mã số thuế", "079194000009"));

        assertThat(errors(outcome)).containsExactly("2 H identity.taxCode not_id_number 079194000009");
    }

    @Test
    void numbersRepeatedInsideTheFileMarkEveryRowWithTheOthers() {
        Outcome outcome = check(hr, true,
                person("A", "079194000001").set("Số sổ BHXH", "7900000001"),
                person("B", "079194000001"),
                person("C", "079194000003").set("Mã số thuế", "0300000001").set("Số sổ BHXH", "7900000001"),
                person("D", "079194000004").set("Mã số thuế", "0300000001"),
                person("E", "079194000001"));

        assertThat(outcome.errors()).extracting(error -> error.row() + " " + error.column() + " " + error.code()
                + " " + error.otherRows()).containsExactly(
                "2 E duplicate_in_file [3, 6]",
                "2 I duplicate_in_file [4]",
                "3 E duplicate_in_file [2, 6]",
                "4 H duplicate_in_file [5]",
                "4 I duplicate_in_file [2]",
                "5 H duplicate_in_file [4]",
                "6 E duplicate_in_file [2, 3]");
    }

    @Test
    void aTaxCodeOrInsuranceNumberOfAnotherEmployeeIsTakenNamingThemOnlyWithinTheScope() {
        Outcome forHr = check(hr, true,
                person("A", "079194000001").set("Mã số thuế", "0101234567").set("Số sổ BHXH", "7912340000"));
        assertThat(errors(forHr)).containsExactly("2 H identity.taxCode taken 0101234567",
                "2 I identity.socialInsuranceNumber taken 7912340000");
        assertThat(forHr.errors().getFirst().conflict().code()).isEqualTo("NV00001");

        Outcome forLineManager = check(lineManager, true,
                person("A", "079194000001").set("Mã số thuế", "0109999999"));
        assertThat(forLineManager.errors().getFirst().code()).isEqualTo("taken");
        assertThat(forLineManager.errors().getFirst().conflict()).as("Đỗ Văn Bình is outside the scope").isNull();
    }

    @Test
    void identityNumbersAreMaskedInTheRowsAndErrorsWithoutThePermission() {
        Outcome outcome = check(hr, false,
                person("A", "079194000001").set("Mã số thuế", "0101234567"),
                person("B", "0791940000"));

        assertThat(outcome.errors()).extracting(EmployeeImportError::value)
                .containsExactly("••••••4567", "••••••0000");
        assertThat(outcome.rows()).extracting(row -> row.row().idNumber())
                .containsExactly("••••••••0001", "••••••0000");
    }

    @Test
    void theKeysToLoadAreTheCodesTheNumbersAndTheCccdAsATaxCode() {
        EmployeeImportCheck.Keys keys = EmployeeImportCheck.keys(EmployeeSheetReader.read(ImportFiles.template()
                .add(person("A", "079194 000001").set("Mã nhân viên", "nv00001").set("Mã NV quản lý", "NV00002")
                        .set("Mã số thuế", "0101234567").set("Số sổ BHXH", "7912340000"))
                .bytes()));

        assertThat(keys.codes()).containsExactlyInAnyOrder("NV00001", "NV00002");
        assertThat(keys.idNumbers()).containsExactly("079194000001");
        assertThat(keys.taxCodes()).containsExactlyInAnyOrder("0101234567", "079194000001");
        assertThat(keys.socialInsuranceNumbers()).containsExactly("7912340000");
    }

    // --- helpers ---

    private static Person person(String fullName, String idNumber) {
        return ImportFiles.person(fullName, idNumber, "WEB", "CV");
    }

    private Outcome check(AccessScope scope, boolean unmasked, Person... people) {
        ImportFiles file = ImportFiles.template();
        for (Person person : people) {
            file.add(person);
        }
        return EmployeeImportCheck.check(EmployeeSheetReader.read(file.bytes()), lookups, scope, unmasked, TODAY);
    }

    /** "row column field code value" per error. */
    private static List<String> errors(Outcome outcome) {
        return outcome.errors().stream()
                .map(error -> "%d %s %s %s %s".formatted(error.row(), error.column(), error.field(), error.code(),
                        error.value()))
                .toList();
    }

    private static Employee employee(String code, String fullName, UUID orgUnitId, String idNumber, String taxCode,
            String socialInsuranceNumber, EmployeeStatus status) {
        Employee employee = new Employee(code,
                new EmployeePersonalFields(fullName, LocalDate.of(1990, 1, 1), Gender.MALE, null, null, null, null,
                        null, null),
                new EmployeeIdentityFields(idNumber, null, null, taxCode, socialInsuranceNumber),
                new EmployeeJobFields(orgUnitId, CV, null, LocalDate.of(2020, 1, 1), status), Instant.now());
        ReflectionTestUtils.setField(employee, "id", UUID.randomUUID());
        return employee;
    }
}
