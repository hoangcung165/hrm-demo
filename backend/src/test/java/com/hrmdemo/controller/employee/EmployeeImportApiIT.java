package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.orgunit.OrgUnitType;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.support.ImportFiles;
import com.hrmdemo.support.ImportFiles.Person;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * The Excel import (HRM-07/BE-2) against real PostgreSQL: files built with POI, checked, then imported. Every test
 * starts without Employees and with the code counter at 0, so the first new code is NV00001.
 */
@IntegrationTest
class EmployeeImportApiIT {

    static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    OrgUnitRepository orgUnits;
    @Autowired
    DataSource dataSource;

    final List<OrgUnit> savedUnits = new ArrayList<>();
    JdbcTemplate jdbc;
    String hr;
    String unit;
    String position;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        testEmployees.deleteAll();
        hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));
        unit = saveUnit().getCode();
        position = jdbc.queryForObject("select code from catalog_item where id = ?", String.class,
                testEmployees.position());
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        orgUnits.deleteAllInBatch(savedUnits);
    }

    @Test
    void aValidFileIsCheckedThenImportedWithCodesInRowOrder() {
        byte[] file = file(person("Trần Thị Mai", "079194005678"), person("Lê Văn Hùng", "040090123456")
                .set("Mã số thuế", "0101234567").set("Trạng thái", "Chính thức"));

        MvcTestResult checked = validate(hr, file);
        assertThat(checked).hasStatusOk();
        assertThat(checked).bodyJson().extractingPath("$.fileName").isEqualTo("nhan-vien.xlsx");
        assertThat(checked).bodyJson().extractingPath("$.summary").isEqualTo(
                Map.of("totalRows", 2, "validRows", 2, "errorRows", 0, "existingRows", 0));
        assertThat(checked).bodyJson().extractingPath("$.rows[0].orgUnit.code").isEqualTo(unit);
        assertThat(checked).bodyJson().extractingPath("$.rows[1].employeeStatus").isEqualTo("OFFICIAL");
        assertThat(count()).as("nothing written by the check").isZero();
        String checksum = JsonPath.read(body(checked), "$.checksum");
        assertThat(checksum).startsWith("sha256:").hasSize(7 + 64);

        MvcTestResult imported = importFile(hr, file, false, checksum);

        assertThat(imported).hasStatus(201);
        assertThat(imported).bodyJson().extractingPath("$.createdCount").isEqualTo(2);
        assertThat(imported).bodyJson().extractingPath("$.created[*].code").asArray()
                .containsExactly("NV00001", "NV00002");
        assertThat(imported).bodyJson().extractingPath("$.created[*].row").asArray().containsExactly(2, 3);
        Map<String, Object> mai = jdbc.queryForMap("""
                select e.full_name, e.status, e.tax_code, u.code as unit
                from employee e join org_unit u on u.id = e.org_unit_id where e.code = 'NV00001'""");
        assertThat(mai).containsEntry("full_name", "Trần Thị Mai").containsEntry("status", "PROBATION")
                .containsEntry("tax_code", "079194005678").containsEntry("unit", unit);
        assertThat(get(hr, "/api/employees/next-code")).bodyJson().extractingPath("$.code").isEqualTo("NV00003");
    }

    @Test
    void errorsCarryRowAndColumnAndBlockTheWholeFileUnlessInvalidRowsAreSkipped() {
        byte[] file = file(person("Trần Thị Mai", "079194005678"),
                person("Lê Văn Hùng", "0400901234").set("Mã chức danh *", "KHONGCO"),
                person("Đỗ Văn Bình", "001195000003"));

        MvcTestResult checked = validate(hr, file);
        assertThat(checked).bodyJson().extractingPath("$.summary.errorRows").isEqualTo(1);
        assertThat(checked).bodyJson().extractingPath("$.errors").isEqualTo(List.of(
                Map.of("row", 3, "column", "E", "header", "Số CCCD", "field", "identity.idNumber",
                        "code", "invalid", "value", "0400901234"),
                Map.of("row", 3, "column", "N", "header", "Mã chức danh", "field", "job.positionId",
                        "code", "not_found", "value", "KHONGCO")));
        assertThat(checked).bodyJson().extractingPath("$.rows[1].status").isEqualTo("INVALID");

        MvcTestResult refused = importFile(hr, file, false, null);
        assertThat(refused).hasStatus(400);
        assertThat(refused).bodyJson().extractingPath("$.code").isEqualTo("import.rows_invalid");
        assertThat(refused).bodyJson().extractingPath("$.errors[0].row").isEqualTo(3);
        assertThat(refused).bodyJson().extractingPath("$.summary.validRows").isEqualTo(2);
        assertThat(count()).as("all or nothing").isZero();

        MvcTestResult skipped = importFile(hr, file, true, null);
        assertThat(skipped).hasStatus(201);
        assertThat(skipped).bodyJson().extractingPath("$.createdCount").isEqualTo(2);
        assertThat(skipped).bodyJson().extractingPath("$.skippedInvalidRows").isEqualTo(1);
        assertThat(skipped).bodyJson().extractingPath("$.created[*].row").asArray().containsExactly(2, 4);
        assertThat(count()).isEqualTo(2);
    }

    @Test
    void importingTheSameFileTwiceOrAnExportOfItCreatesNothingMore() {
        byte[] file = file(person("Trần Thị Mai", "079194005678"), person("Lê Văn Hùng", "040090123456"));
        assertThat(importFile(hr, file, false, null)).hasStatus(201);

        MvcTestResult again = validate(hr, file);
        assertThat(again).bodyJson().extractingPath("$.summary.existingRows").isEqualTo(2);
        assertThat(again).bodyJson().extractingPath("$.rows[0].matchedBy").isEqualTo("ID_NUMBER");
        assertThat(again).bodyJson().extractingPath("$.rows[0].existing.code").isEqualTo("NV00001");
        MvcTestResult nothing = importFile(hr, file, false, null);
        assertThat(nothing).hasStatus(400);
        assertThat(nothing).bodyJson().extractingPath("$.code").isEqualTo("import.nothing_to_import");

        // An export of the same people, numbers masked for a Director: matched by Mã nhân viên.
        String director = testAccounts.bearer(mvc, testAccounts.create(Role.DIRECTOR));
        byte[] export = get(director, "/api/employees/export").getResponse().getContentAsByteArray();
        MvcTestResult exported = validate(hr, export);
        assertThat(exported).hasStatusOk();
        assertThat(exported).bodyJson().extractingPath("$.summary.existingRows").isEqualTo(2);
        assertThat(exported).bodyJson().extractingPath("$.rows[*].matchedBy").asArray()
                .containsExactly("CODE", "CODE");
        assertThat(importFile(hr, export, true, null)).hasStatus(400);
        assertThat(count()).isEqualTo(2);
    }

    @Test
    void aFileThatChangedSinceTheCheckIsRefused() {
        byte[] checkedFile = file(person("Trần Thị Mai", "079194005678"));
        String checksum = JsonPath.read(body(validate(hr, checkedFile)), "$.checksum");
        byte[] changed = file(person("Trần Thị Mai", "079194005679"));

        MvcTestResult refused = importFile(hr, changed, false, checksum);

        assertThat(refused).hasStatus(409);
        assertThat(refused).bodyJson().extractingPath("$.code").isEqualTo("import.file_changed");
        assertThat(count()).isZero();
    }

    @Test
    void fileErrorsUseTheirOwnCodes() {
        assertCode(validate(hr, "a;b\n".getBytes(StandardCharsets.UTF_8)), 400, "import.file_invalid");
        assertCode(validate(hr, ImportFiles.template().bytes()), 400, "import.empty");
        MvcTestResult headers = validate(hr, ImportFiles.of("Nhân viên", List.of("Tên", "CCCD"))
                .add(new Person().set("Tên", "Mai")).bytes());
        assertCode(headers, 400, "import.headers_invalid");
        assertThat(headers).bodyJson().extractingPath("$.missing").asArray().contains("Họ và tên *", "Số CCCD *");
        assertCode(mvc.post().uri("/api/employees/import/validate").header(HttpHeaders.AUTHORIZATION, hr)
                .multipart().exchange(), 400, "import.file_missing");

        byte[] tooLarge = new byte[5 * 1024 * 1024 + 1];
        MvcTestResult large = validate(hr, tooLarge);
        assertCode(large, 413, "import.file_too_large");
        assertThat(large).bodyJson().extractingPath("$.limit").isEqualTo(5 * 1024 * 1024);
    }

    @Test
    void bothCallsNeedTheEditPermissionAndASignIn() {
        byte[] file = file(person("Trần Thị Mai", "079194005678"));
        String director = testAccounts.bearer(mvc, testAccounts.create(Role.DIRECTOR));

        assertCode(validate(director, file), 403, "auth.forbidden");
        assertCode(importFile(director, file, true, null), 403, "auth.forbidden");
        assertThat(mvc.post().uri("/api/employees/import/validate").multipart()
                .file(new MockMultipartFile("file", "x.xlsx", XLSX, file)).exchange()).hasStatus(401);
        assertThat(count()).isZero();
    }

    @Test
    void aThousandRowsAreCheckedAndImportedInAFewSeconds() {
        List<Person> people = new ArrayList<>();
        for (int i = 1; i <= 1000; i++) {
            people.add(person("Nhân viên số " + i, "0791940%05d".formatted(i))
                    .set("Số điện thoại", "09%08d".formatted(i)));
        }
        byte[] file = file(people.toArray(Person[]::new));

        long start = System.nanoTime();
        MvcTestResult checked = validate(hr, file);
        long checkMillis = (System.nanoTime() - start) / 1_000_000;
        assertThat(checked).bodyJson().extractingPath("$.summary.validRows").isEqualTo(1000);
        start = System.nanoTime();
        MvcTestResult imported = importFile(hr, file, false, null);
        long importMillis = (System.nanoTime() - start) / 1_000_000;

        assertThat(imported).hasStatus(201);
        assertThat(imported).bodyJson().extractingPath("$.createdCount").isEqualTo(1000);
        assertThat(count()).isEqualTo(1000);
        assertThat(jdbc.queryForObject("select max(code) from employee", String.class)).isEqualTo("NV01000");
        System.out.printf("1,000-row import: check %d ms, import %d ms%n", checkMillis, importMillis);
        // Generous, so a slow CI machine does not fail; the log has the real numbers.
        assertThat(checkMillis + importMillis).isLessThan(20_000);
    }

    @Test
    void theOpenApiDocumentDescribesBothCalls() {
        MvcTestResult docs = get(hr, "/v3/api-docs");
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/employees/import/validate'].post").isNotNull();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/employees/import'].post").isNotNull();
    }

    // --- helpers ---

    private Person person(String fullName, String idNumber) {
        return ImportFiles.person(fullName, idNumber, unit, position);
    }

    private static byte[] file(Person... people) {
        ImportFiles file = ImportFiles.template();
        for (Person person : people) {
            file.add(person);
        }
        return file.bytes();
    }

    private MvcTestResult validate(String bearer, byte[] content) {
        return mvc.post().uri("/api/employees/import/validate").header(HttpHeaders.AUTHORIZATION, bearer)
                .multipart().file(new MockMultipartFile("file", "nhan-vien.xlsx", XLSX, content)).exchange();
    }

    private MvcTestResult importFile(String bearer, byte[] content, boolean skipInvalid, String checksum) {
        var request = mvc.post().uri("/api/employees/import").header(HttpHeaders.AUTHORIZATION, bearer)
                .multipart().file(new MockMultipartFile("file", "nhan-vien.xlsx", XLSX, content))
                .param("skipInvalid", String.valueOf(skipInvalid));
        if (checksum != null) {
            request = request.param("checksum", checksum);
        }
        return request.exchange();
    }

    private MvcTestResult get(String bearer, String path) {
        return mvc.get().uri(path).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    private long count() {
        return jdbc.queryForObject("select count(*) from employee", Long.class);
    }

    private OrgUnit saveUnit() {
        String code = "I" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        OrgUnit unit = orgUnits.save(
                new OrgUnit(null, code, "Unit " + code, OrgUnitType.DEPARTMENT, null, 0, Instant.now()));
        savedUnits.add(unit);
        return unit;
    }

    private static void assertCode(MvcTestResult result, int status, String code) {
        assertThat(result).hasStatus(status);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo(code);
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
