package com.hrmdemo.service.exampledata;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import com.hrmdemo.service.legalentity.LegalEntityService;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * The example data seeder against real PostgreSQL, with {@code hrm.example-data.enabled} on (its own Spring
 * context). The seeder already ran when that context started; what it found then depends on the database
 * (a fresh container, or a shared one with units of other tests). So each test puts the company back to the
 * state of a new installation, runs the seeder itself, and cleans up afterwards.
 */
@IntegrationTest
@TestPropertySource(properties = "hrm.example-data.enabled=true")
class ExampleDataSeederIT {

    /** Expected tree in display order: code, parent code ("-" = the company), type, sort order, active. */
    static final List<String> EXPECTED = List.of(
            "PTPM   -     DEPARTMENT 1 true",
            "WEB    PTPM  TEAM       1 true",
            "MOBILE PTPM  TEAM       2 true",
            "DEVOPS PTPM  TEAM       3 true",
            "DATA   PTPM  TEAM       4 true",
            "QA     PTPM  TEAM       5 true",
            "GAME   PTPM  TEAM       6 false",
            "DVKH   -     DEPARTMENT 2 true",
            "TK     DVKH  TEAM       1 true",
            "HTKH   DVKH  TEAM       2 true",
            "KD     -     DEPARTMENT 3 true",
            "KDGP   KD    TEAM       1 true",
            "MKT    KD    TEAM       2 true",
            "HCNS   -     DEPARTMENT 4 true",
            "TCKT   -     DEPARTMENT 5 true",
            "CNDN   -     BRANCH     6 true",
            "PMDN   CNDN  DEPARTMENT 1 true",
            "WEBDN  PMDN  TEAM       1 true",
            "MOBDN  PMDN  TEAM       2 true",
            "KTDN   CNDN  DEPARTMENT 2 true");

    @Autowired
    ExampleDataSeeder seeder;
    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    String admin;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        resetToNewInstallation();
        admin = testAccounts.adminBearer(mvc);
    }

    @AfterEach
    void cleanUp() {
        resetToNewInstallation();
    }

    @Test
    void aNewInstallationGetsTheExampleCompanyAndItsOrgTree() {
        seed();

        MvcTestResult tree = get("/api/org-units");
        assertThat(tree).hasStatusOk();
        assertThat(describe(tree))
                .containsExactlyElementsOf(EXPECTED.stream().map(ExampleDataSeederIT::squash).toList());
        String json = body(tree);
        assertThat(JsonPath.<List<String>>read(json, "$.units[*].name"))
                .contains("Phòng Phát triển phần mềm", "Nhóm Nền tảng và DevOps", "Phòng Hành chính - Nhân sự",
                        "Chi nhánh Đà Nẵng", "Phòng Kiểm thử Đà Nẵng")
                .hasSize(20);
        assertThat(JsonPath.<List<Object>>read(json, "$.units[?(@.head != null)]")).isEmpty();
        assertThat(JsonPath.<Integer>read(json, "$.summary.activeUnitCount")).isEqualTo(19);
        assertThat(JsonPath.<Map<String, Object>>read(json, "$.root"))
                .containsEntry("name", "Công ty Cổ phần Công nghệ Mẫu")
                .containsEntry("childCount", 6);
        assertThat(JsonPath.<Map<String, Object>>read(json, "$.root.head"))
                .containsEntry("fullName", "Phạm Quốc Bảo")
                .containsEntry("position", "Giám đốc");

        MvcTestResult company = get("/api/company");
        assertThat(company).hasStatusOk();
        assertThat(JsonPath.<Map<String, Object>>read(body(company), "$"))
                .containsEntry("name", "Công ty Cổ phần Công nghệ Mẫu")
                .containsEntry("taxCode", "0312345678")
                .containsEntry("address", "Tầng 5, 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh")
                .containsEntry("legalRepresentativeName", "Phạm Quốc Bảo")
                .containsEntry("legalRepresentativeTitle", "Giám đốc")
                .containsEntry("logoUrl", null);
    }

    @Test
    void runningTheSeederAgainChangesNothing() {
        seed();
        List<Map<String, Object>> unitsBefore = unitRows();
        Map<String, Object> companyBefore = companyRow();

        seed();

        assertThat(unitRows()).hasSize(20).isEqualTo(unitsBefore);
        assertThat(companyRow()).isEqualTo(companyBefore);
    }

    @Test
    void nothingIsCreatedWhenTheCompanyAlreadyHasAUnit() {
        assertThat(mvc.post().uri("/api/org-units").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"Engineering","code":"ENG","type":"DEPARTMENT"}""")).hasStatus(201);
        Map<String, Object> companyBefore = companyRow();

        seed();

        assertThat(JsonPath.<List<String>>read(body(get("/api/org-units")), "$.units[*].code"))
                .containsExactly("ENG");
        // Company info is part of the same all-or-nothing decision.
        assertThat(companyRow()).isEqualTo(companyBefore).containsEntry("name", LegalEntityService.DEFAULT_NAME);
    }

    @Test
    void aCompanyTheAdminRenamedKeepsItsInfoButStillGetsTheUnits() {
        assertThat(mvc.put().uri("/api/company").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"Acme Software JSC","address":"1 Main Street"}""")).hasStatusOk();
        Map<String, Object> companyBefore = companyRow();

        seed();

        assertThat(companyRow()).isEqualTo(companyBefore)
                .containsEntry("name", "Acme Software JSC")
                .containsEntry("tax_code", null);
        String tree = body(get("/api/org-units"));
        assertThat(JsonPath.<List<Object>>read(tree, "$.units")).hasSize(20);
        assertThat(JsonPath.<String>read(tree, "$.root.name")).isEqualTo("Acme Software JSC");
    }

    @Test
    void theLogoIsNeverTouched() {
        jdbc.update("update legal_entity set logo = ?, logo_content_type = 'image/png', logo_updated_at = now()",
                new Object[] {new byte[] {1, 2, 3}});
        Map<String, Object> logoBefore = jdbc.queryForMap(
                "select encode(logo, 'hex') as logo, logo_content_type, logo_updated_at from legal_entity");

        seed();

        assertThat(jdbc.queryForMap(
                "select encode(logo, 'hex') as logo, logo_content_type, logo_updated_at from legal_entity"))
                .isEqualTo(logoBefore).containsEntry("logo", "010203");
        assertThat(companyRow()).containsEntry("name", "Công ty Cổ phần Công nghệ Mẫu");
    }

    private void seed() {
        seeder.run(new DefaultApplicationArguments());
    }

    /** No units, and the Legal entity as the migration creates it. */
    private void resetToNewInstallation() {
        // One statement removes parents and children together.
        jdbc.update("delete from org_unit");
        jdbc.update("""
                update legal_entity
                set name = ?, tax_code = null, address = null, legal_representative_name = null,
                    legal_representative_title = null, logo = null, logo_content_type = null, logo_updated_at = null""",
                LegalEntityService.DEFAULT_NAME);
    }

    private List<Map<String, Object>> unitRows() {
        return jdbc.queryForList("""
                select id, parent_id, code, name, type, active, sort_order, created_at, updated_at
                from org_unit order by code""");
    }

    private Map<String, Object> companyRow() {
        return jdbc.queryForMap("""
                select name, tax_code, address, legal_representative_name, legal_representative_title,
                       logo_content_type, updated_at
                from legal_entity""");
    }

    private MvcTestResult get(String path) {
        return mvc.get().uri(path).header(HttpHeaders.AUTHORIZATION, admin).exchange();
    }

    /** One line per unit, in response order, in the format of {@link #EXPECTED} with single spaces. */
    private static List<String> describe(MvcTestResult tree) {
        List<Map<String, Object>> units = JsonPath.read(body(tree), "$.units");
        Map<Object, Object> codeById = new LinkedHashMap<>();
        units.forEach(unit -> codeById.put(unit.get("id"), unit.get("code")));
        return units.stream()
                .map(unit -> "%s %s %s %s %s".formatted(unit.get("code"),
                        unit.get("parentId") == null ? "-" : codeById.get(unit.get("parentId")),
                        unit.get("type"), unit.get("sortOrder"), unit.get("active")))
                .toList();
    }

    private static String squash(String line) {
        return line.replaceAll(" +", " ");
    }

    /** Decoded as UTF-8 whatever the mock response declares: the names are Vietnamese. */
    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
