package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.orgunit.OrgUnitType;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
import com.hrmdemo.support.TestEmployees;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * The Excel template and export (HRM-07/BE-1) against real PostgreSQL, each file parsed back with POI. The export
 * limit is lowered to 3 rows here, so the too-many-rows case needs only four Employees.
 */
@IntegrationTest
@TestPropertySource(properties = "hrm.employees.export.max-rows=3")
class EmployeeExcelApiIT {

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

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        testEmployees.deleteAll();
        hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        orgUnits.deleteAllInBatch(savedUnits);
    }

    // --- template ---

    @Test
    void theTemplateIsAnXlsxWithTheHeadersTheDropdownsAndTheActiveUnits() throws IOException {
        OrgUnit active = saveUnit(null, true);
        OrgUnit closed = saveUnit(null, false);
        UUID position = testEmployees.position();

        MvcTestResult result = get(hr, "/api/employees/import/template");

        assertThat(result).hasStatusOk();
        assertThat(result).hasContentType(XLSX);
        assertThat(result).hasHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"mau-nhap-nhan-vien.xlsx\"");
        assertThat(result.getResponse().getHeader(HttpHeaders.CACHE_CONTROL)).isEqualTo("no-store");
        try (XSSFWorkbook workbook = workbook(result)) {
            assertThat(workbook.getSheetAt(0).getSheetName()).isEqualTo("Nhân viên");
            assertThat(workbook.getSheetAt(1).getSheetName()).isEqualTo("Hướng dẫn");
            assertThat(workbook.getSheetAt(2).getSheetName()).isEqualTo("Danh mục");
            XSSFSheet data = workbook.getSheet("Nhân viên");
            assertThat(header(data)).startsWith("Mã nhân viên", "Họ và tên *", "Ngày sinh *", "Giới tính *",
                    "Số CCCD *").hasSize(17).endsWith("Trạng thái");
            assertThat(data.getLastRowNum()).isZero();

            Map<String, String> dropdowns = data.getDataValidations().stream().collect(Collectors.toMap(
                    validation -> validation.getRegions().getCellRangeAddress(0).formatAsString(),
                    validation -> validation.getValidationConstraint().getFormula1()));
            assertThat(dropdowns).containsOnlyKeys("D2:D1001", "M2:M1001", "N2:N1001", "Q2:Q1001")
                    .containsEntry("M2:M1001", "DonVi");
            assertThat(data.getColumnStyle(4).getDataFormatString()).as("CCCD is text").isEqualTo("@");
            assertThat(data.getColumnStyle(2).getDataFormatString()).as("Ngày sinh is a date")
                    .isEqualTo("dd/mm/yyyy");

            Sheet reference = workbook.getSheet("Danh mục");
            assertThat(referenceColumn(reference, 0)).contains(active.getCode()).doesNotContain(closed.getCode());
            String positionCode = jdbc.queryForObject("select code from catalog_item where id = ?", String.class,
                    position);
            assertThat(referenceColumn(reference, 4)).contains(positionCode);
            assertThat(workbook.getName("DonVi").getRefersToFormula()).startsWith("'Danh mục'!$A$4:$A$");
        }
    }

    @Test
    void theTemplateNeedsTheEditPermissionAndASignIn() {
        String director = testAccounts.bearer(mvc, testAccounts.create(Role.DIRECTOR));
        MvcTestResult refused = get(director, "/api/employees/import/template");
        assertThat(refused).hasStatus(403);
        assertThat(refused).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
        assertThat(mvc.get().uri("/api/employees/import/template").exchange()).hasStatus(401);
    }

    // --- export ---

    @Test
    void theExportKeepsTheFiltersAndWritesFullNumbersForACallerWhoMaySeeThem() throws IOException {
        OrgUnit web = saveUnit(null, true);
        OrgUnit other = saveUnit(null, true);
        UUID mai = testEmployees.create("Trần Thị Mai", web.getId());
        testEmployees.create("Lê Văn Hùng", web.getId(), "PROBATION");
        testEmployees.create("Đỗ Văn Bình", other.getId());
        jdbc.update("update employee set tax_code = id_number where id = ?", mai);

        MvcTestResult result = get(hr, "/api/employees/export?orgUnitId=" + web.getId() + "&status=OFFICIAL");

        assertThat(result).hasStatusOk();
        assertThat(result).hasContentType(XLSX);
        String today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).toString();
        assertThat(result).hasHeader(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"nhan-vien-" + today + ".xlsx\"");
        assertThat(result).hasHeader("X-Total-Count", "1");
        try (XSSFWorkbook workbook = workbook(result)) {
            assertThat(workbook.getSheetAt(0).getSheetName()).isEqualTo("Nhân viên");
            assertThat(workbook.getSheetAt(1).getSheetName()).isEqualTo("Danh mục");
            assertThat(workbook.getSheetAt(2).getSheetName()).isEqualTo("Thông tin");
            Sheet data = workbook.getSheet("Nhân viên");
            assertThat(header(data)).hasSize(20).endsWith("Tên đơn vị", "Tên chức danh", "Quản lý trực tiếp");
            assertThat(data.getLastRowNum()).as("one row: the filter applies").isEqualTo(1);
            Row row = data.getRow(1);
            String idNumber = jdbc.queryForObject("select id_number from employee where id = ?", String.class, mai);
            String code = jdbc.queryForObject("select code from employee where id = ?", String.class, mai);
            assertThat(text(row, "A")).isEqualTo(code);
            assertThat(text(row, "B")).isEqualTo("Trần Thị Mai");
            assertThat(text(row, "E")).isEqualTo(idNumber);
            assertThat(text(row, "H")).isEqualTo(idNumber);
            assertThat(text(row, "M")).isEqualTo(web.getCode());
            assertThat(text(row, "Q")).isEqualTo("Chính thức");
            assertThat(row.getCell(col("C")).getCellType()).as("a real date").isEqualTo(CellType.NUMERIC);
            assertThat(row.getCell(col("C")).getLocalDateTimeCellValue().toLocalDate())
                    .isEqualTo(LocalDate.of(1990, 1, 1));
            assertThat(workbook.getSheet("Thông tin").getRow(7) == null).as("nothing masked").isTrue();
        }
    }

    @Test
    void withoutTheSensitivePermissionTheNumbersAreMaskedToTheLastFourDigits() throws IOException {
        OrgUnit web = saveUnit(null, true);
        UUID mai = testEmployees.create("Trần Thị Mai", web.getId());
        String director = testAccounts.bearer(mvc, testAccounts.create(Role.DIRECTOR));

        MvcTestResult result = get(director, "/api/employees/export");

        assertThat(result).hasStatusOk();
        String idNumber = jdbc.queryForObject("select id_number from employee where id = ?", String.class, mai);
        try (XSSFWorkbook workbook = workbook(result)) {
            assertThat(text(workbook.getSheet("Nhân viên").getRow(1), "E"))
                    .isEqualTo("••••••••" + idNumber.substring(8));
            assertThat(workbook.getSheet("Thông tin").getRow(7).getCell(0).getStringCellValue())
                    .startsWith("Số CCCD, mã số thuế, số sổ BHXH đã được che");
        }
    }

    @Test
    void aLineManagerExportsTheUnitsTheyHeadOnly() throws IOException {
        OrgUnit department = saveUnit(null, true);
        OrgUnit elsewhere = saveUnit(null, true);
        UUID head = testEmployees.create("Lê Minh Quân", department.getId());
        testEmployees.makeHead(department.getId(), head);
        testEmployees.create("Trần Thị Mai", department.getId());
        testEmployees.create("Đỗ Văn Bình", elsewhere.getId());
        TestAccount account = testAccounts.create(Role.LINE_MANAGER, Role.EMPLOYEE);
        testEmployees.link(account.id(), head);

        MvcTestResult result = get(testAccounts.bearer(mvc, account), "/api/employees/export?sort=fullName");

        assertThat(result).hasStatusOk();
        try (XSSFWorkbook workbook = workbook(result)) {
            Sheet data = workbook.getSheet("Nhân viên");
            List<String> names = new ArrayList<>();
            for (int r = 1; r <= data.getLastRowNum(); r++) {
                names.add(text(data.getRow(r), "B"));
            }
            assertThat(names).containsExactly("Lê Minh Quân", "Trần Thị Mai");
            assertThat(referenceColumn(workbook.getSheet("Danh mục"), 0)).containsExactly(department.getCode());
        }
    }

    @Test
    void moreRowsThanTheLimitAreRefusedWithTheLimitAndTheTotal() {
        OrgUnit web = saveUnit(null, true);
        for (String name : List.of("An", "Bình", "Chi", "Dũng")) {
            testEmployees.create("Nguyễn " + name, web.getId());
        }

        MvcTestResult result = get(hr, "/api/employees/export");

        assertThat(result).hasStatus(400);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("export.too_many_rows");
        assertThat(result).bodyJson().extractingPath("$.limit").isEqualTo(3);
        assertThat(result).bodyJson().extractingPath("$.total").isEqualTo(4);
        // A narrower filter fits.
        assertThat(get(hr, "/api/employees/export?q=nguyen%20an")).hasStatusOk();
    }

    @Test
    void theExportNeedsTheViewPermissionAndValidFilters() {
        String pm = testAccounts.bearer(mvc, testAccounts.create(Role.PROJECT_MANAGER));
        MvcTestResult refused = get(pm, "/api/employees/export");
        assertThat(refused).hasStatus(403);
        assertThat(refused).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");

        MvcTestResult invalid = get(hr, "/api/employees/export?sort=salary");
        assertThat(invalid).hasStatus(400);
        assertThat(invalid).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(invalid).bodyJson().extractingPath("$.errors[0].field").isEqualTo("sort");
        assertThat(mvc.get().uri("/api/employees/export").exchange()).hasStatus(401);
    }

    @Test
    void theOpenApiDocumentDescribesBothFiles() {
        MvcTestResult docs = get(hr, "/v3/api-docs");
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/employees/export'].get").isNotNull();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/employees/import/template'].get").isNotNull();
    }

    // --- helpers ---

    private OrgUnit saveUnit(UUID parentId, boolean active) {
        String code = "X" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        OrgUnit unit = new OrgUnit(parentId, code, "Unit " + code, OrgUnitType.DEPARTMENT, null, 0, Instant.now());
        if (!active) {
            unit.deactivate(Instant.now());
        }
        unit = orgUnits.save(unit);
        savedUnits.add(0, unit);
        return unit;
    }

    private MvcTestResult get(String bearer, String path) {
        return mvc.get().uri(path).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    private static XSSFWorkbook workbook(MvcTestResult result) throws IOException {
        return new XSSFWorkbook(new ByteArrayInputStream(result.getResponse().getContentAsByteArray()));
    }

    private static List<String> header(Sheet sheet) {
        List<String> header = new ArrayList<>();
        sheet.getRow(0).forEach(cell -> header.add(cell.getStringCellValue()));
        return header;
    }

    /** The values of one column of "Danh mục", below its header row (row 3). */
    private static List<String> referenceColumn(Sheet sheet, int index) {
        List<String> values = new ArrayList<>();
        for (int r = 3; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            Cell cell = row == null ? null : row.getCell(index);
            if (cell != null) {
                values.add(cell.getStringCellValue());
            }
        }
        return values;
    }

    /** A text cell (format {@code @}), as Excel shows it. */
    private static String text(Row row, String column) {
        Cell cell = row.getCell(col(column));
        assertThat(cell.getCellType()).as(column).isEqualTo(CellType.STRING);
        assertThat(cell.getCellStyle().getDataFormatString()).as(column).isEqualTo("@");
        return cell.getStringCellValue();
    }

    private static int col(String letter) {
        return CellReference.convertColStringToIndex(letter);
    }
}
