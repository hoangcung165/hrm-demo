package com.hrmdemo.controller.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.UnsupportedEncodingException;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Catalogs API against real PostgreSQL. Every test starts from empty catalogs. */
@IntegrationTest
class CatalogApiIT {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    DataSource dataSource;

    String admin;

    @BeforeEach
    void setUp() {
        new JdbcTemplate(dataSource).update("delete from catalog_item");
        admin = testAccounts.adminBearer(mvc);
    }

    @Test
    void aPositionIsAddedWithItsCodeUpperCasedAndFoundByNameOrCodeWithoutAccents() {
        MvcTestResult created = post(admin, "positions", """
                {"code":" tp ","name":"  Trưởng phòng "}""");
        assertThat(created).hasStatus(201);
        assertThat(created).bodyJson().extractingPath("$.code").isEqualTo("TP");
        assertThat(created).bodyJson().extractingPath("$.name").isEqualTo("Trưởng phòng");
        assertThat(created).bodyJson().extractingPath("$.active").isEqualTo(true);
        assertThat(created).bodyJson().extractingPath("$.inUse").isEqualTo(false);
        assertThat(created).bodyJson().extractingPath("$.term").isNull();
        assertThat(created).bodyJson().extractingPath("$.startDate").isNull();
        post(admin, "positions", """
                {"code":"NV","name":"Nhân viên"}""");

        assertThat(list(admin, "positions", "")).bodyJson().extractingPath("$.items[*].name").asArray()
                .containsExactly("Nhân viên", "Trưởng phòng");
        assertThat(list(admin, "positions", "q=truong")).bodyJson().extractingPath("$.items[*].code").asArray()
                .containsExactly("TP");
        assertThat(list(admin, "positions", "q=nv")).bodyJson().extractingPath("$.items[*].code").asArray()
                .containsExactly("NV");
        assertThat(list(admin, "positions", "q=nv")).bodyJson().extractingPath("$.total").isEqualTo(1);
        // Catalogs are separate lists.
        assertThat(list(admin, "skills", "")).bodyJson().extractingPath("$.total").isEqualTo(0);
    }

    @Test
    void codesAndNamesAreUniqueWithinACatalogWhateverTheCaseAndAccents() {
        post(admin, "skills", """
                {"code":"JAVA","name":"Lập trình Java"}""");

        assertConflict(post(admin, "skills", """
                {"code":"java","name":"Java backend"}"""), "catalog.code_taken");
        MvcTestResult nameTaken = post(admin, "skills", """
                {"code":"JAVA2","name":"lap trinh JAVA"}""");
        assertConflict(nameTaken, "catalog.name_taken");
        // The form names the item that holds the name, as it is written.
        assertThat(nameTaken).bodyJson().extractingPath("$.holderName").isEqualTo("Lập trình Java");
        // Another catalog may use the same code and name.
        assertThat(post(admin, "project-roles", """
                {"code":"JAVA","name":"Lập trình Java"}""")).hasStatus(201);
    }

    @Test
    void aContractTypeHasATermAndAFixedTermHasAMaximumOfThirtySixMonths() {
        MvcTestResult fixed = post(admin, "contract-types", """
                {"code":"XDTH","name":"HĐLĐ xác định thời hạn","term":"FIXED","maxMonths":36}""");
        assertThat(fixed).hasStatus(201);
        assertThat(fixed).bodyJson().extractingPath("$.term").isEqualTo("FIXED");
        assertThat(fixed).bodyJson().extractingPath("$.maxMonths").isEqualTo(36);

        assertInvalid(post(admin, "contract-types", """
                {"code":"X2","name":"Too long","term":"FIXED","maxMonths":37}"""), "maxMonths");
        assertInvalid(post(admin, "contract-types", """
                {"code":"X3","name":"No length","term":"FIXED"}"""), "maxMonths");
        assertInvalid(post(admin, "contract-types", """
                {"code":"X4","name":"Indefinite with length","term":"INDEFINITE","maxMonths":12}"""), "maxMonths");
        assertInvalid(post(admin, "contract-types", """
                {"code":"X5","name":"No term"}"""), "term");
    }

    @Test
    void anAllowanceTypeSaysWhetherItCountsForInsuranceAndTax() {
        MvcTestResult meal = post(admin, "allowance-types", """
                {"code":"AN_TRUA","name":"Phụ cấp ăn trưa","insurable":false,"taxable":true}""");
        assertThat(meal).hasStatus(201);
        assertThat(meal).bodyJson().extractingPath("$.insurable").isEqualTo(false);
        assertThat(meal).bodyJson().extractingPath("$.taxable").isEqualTo(true);

        assertInvalid(post(admin, "allowance-types", """
                {"code":"XANG","name":"Phụ cấp xăng xe","taxable":true}"""), "insurable");
    }

    @Test
    void aFieldOfAnotherCatalogIsRefusedNotIgnored() {
        assertInvalid(post(admin, "positions", """
                {"code":"GD","name":"Giám đốc","insurable":true}"""), "insurable");
        assertInvalid(post(admin, "skills", """
                {"code":"SQL","name":"SQL","startDate":"2026-01-01"}"""), "startDate");
        assertInvalid(post(admin, "holidays", """
                {"code":"TET","name":"Tết","startDate":"2026-02-16","endDate":"2026-02-20"}"""), "code");
        assertInvalid(post(admin, "positions", """
                {"code":"G","name":"Too short a code"}"""), "code");
    }

    @Test
    void holidaysAreRangesThatDoNotOverlapAndAreListedByYearAndDate() {
        MvcTestResult tet = post(admin, "holidays", """
                {"name":"Tết Nguyên đán","startDate":"2026-02-16","endDate":"2026-02-20"}""");
        assertThat(tet).hasStatus(201);
        assertThat(tet).bodyJson().extractingPath("$.code").isNull();
        post(admin, "holidays", """
                {"name":"Tết Dương lịch","startDate":"2026-01-01","endDate":"2026-01-01"}""");
        post(admin, "holidays", """
                {"name":"Tết Dương lịch 2027","startDate":"2027-01-01","endDate":"2027-01-01"}""");

        MvcTestResult overlap = post(admin, "holidays", """
                {"name":"Nghỉ thêm","startDate":"2026-02-20","endDate":"2026-02-21"}""");
        assertConflict(overlap, "catalog.holiday_overlap");
        assertThat(overlap).bodyJson().extractingPath("$.holidayName").isEqualTo("Tết Nguyên đán");
        assertThat(overlap).bodyJson().extractingPath("$.holidayStartDate").isEqualTo("2026-02-16");
        assertThat(overlap).bodyJson().extractingPath("$.holidayEndDate").isEqualTo("2026-02-20");
        assertInvalid(post(admin, "holidays", """
                {"name":"Backwards","startDate":"2026-03-02","endDate":"2026-03-01"}"""), "endDate");
        assertInvalid(post(admin, "holidays", """
                {"name":"Too long","startDate":"2026-03-01","endDate":"2026-03-11"}"""), "endDate");

        assertThat(list(admin, "holidays", "year=2026")).bodyJson().extractingPath("$.items[*].name").asArray()
                .containsExactly("Tết Dương lịch", "Tết Nguyên đán");
        assertThat(get(admin, "/api/catalogs/holidays/years")).bodyJson().extractingPath("$.years").asArray()
                .containsExactly(2026, 2027);
        // A year filter means nothing for another catalog.
        assertInvalid(list(admin, "positions", "year=2026"), "year");

        // A holiday name comes back every year: unique within the year of the first day.
        assertThat(post(admin, "holidays", """
                {"name":"tết dương lịch","startDate":"2027-01-02","endDate":"2027-01-02"}""")).hasStatus(201);
        MvcTestResult sameYear = post(admin, "holidays", """
                {"name":"Tet Duong Lich","startDate":"2026-12-31","endDate":"2026-12-31"}""");
        assertConflict(sameYear, "catalog.name_taken");
        assertThat(sameYear).bodyJson().extractingPath("$.holderName").isEqualTo("Tết Dương lịch");

        // Moving a holiday within its own days is not an overlap with itself.
        assertThat(put(admin, "holidays", id(tet), """
                {"name":"Tết Nguyên đán","startDate":"2026-02-15","endDate":"2026-02-20"}""")).hasStatusOk();
    }

    @Test
    void anEditKeepsTheStatusAndDeactivateAndReactivateCanBeRepeated() {
        String id = id(post(admin, "project-roles", """
                {"code":"QA","name":"Kiểm thử viên"}"""));
        assertThat(post(admin, "project-roles/items/" + id + "/deactivate")).bodyJson()
                .extractingPath("$.active").isEqualTo(false);
        assertThat(post(admin, "project-roles/items/" + id + "/deactivate")).hasStatusOk();

        MvcTestResult edited = put(admin, "project-roles", id, """
                {"code":"TESTER","name":"Kiểm thử"}""");
        assertThat(edited).hasStatusOk();
        assertThat(edited).bodyJson().extractingPath("$.code").isEqualTo("TESTER");
        assertThat(edited).bodyJson().extractingPath("$.active").isEqualTo(false);
        // An edit may keep its own code and name.
        assertThat(put(admin, "project-roles", id, """
                {"code":"TESTER","name":"Kiểm thử"}""")).hasStatusOk();

        assertThat(list(admin, "project-roles", "status=ACTIVE")).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(list(admin, "project-roles", "status=INACTIVE")).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(post(admin, "project-roles/items/" + id + "/reactivate")).bodyJson()
                .extractingPath("$.active").isEqualTo(true);
        assertInvalid(list(admin, "project-roles", "status=LOCKED"), "status");
    }

    @Test
    void anItemNothingRefersToIsDeletedAndItsCodeIsFreeAgain() {
        String id = id(post(admin, "skills", """
                {"code":"REACT","name":"React"}"""));

        assertThat(mvc.delete().uri("/api/catalogs/skills/items/" + id).header(HttpHeaders.AUTHORIZATION, admin))
                .hasStatus(204);
        assertThat(list(admin, "skills", "")).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(post(admin, "skills", """
                {"code":"REACT","name":"React"}""")).hasStatus(201);
    }

    @Test
    void anUnknownCatalogOrAnItemOfAnotherCatalogIsNotFound() {
        String skill = id(post(admin, "skills", """
                {"code":"SQL","name":"SQL"}"""));

        assertNotFound(list(admin, "leave-types", ""));
        assertNotFound(post(admin, "positions/items/" + skill + "/deactivate"));
        assertNotFound(mvc.delete().uri("/api/catalogs/positions/items/" + skill)
                .header(HttpHeaders.AUTHORIZATION, admin).exchange());
    }

    @Test
    void everySignedInAccountReadsTheCatalogsButOnlyCatalogEditMayChangeThem() {
        String id = id(post(admin, "positions", """
                {"code":"GD","name":"Giám đốc"}"""));
        String employee = testAccounts.bearer(mvc, testAccounts.create(Role.EMPLOYEE));
        String hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR, Role.EMPLOYEE));

        assertThat(list(employee, "positions", "")).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(get(employee, "/api/catalogs/holidays/years")).hasStatusOk();
        // CATALOG_EDIT is the Admin's by default; the role matrix can give it to HR.
        assertForbidden(post(hr, "positions", """
                {"code":"PGD","name":"Phó giám đốc"}"""));
        assertForbidden(put(hr, "positions", id, """
                {"code":"GD","name":"Tổng giám đốc"}"""));
        assertForbidden(post(employee, "positions/items/" + id + "/deactivate"));
        assertForbidden(mvc.delete().uri("/api/catalogs/positions/items/" + id)
                .header(HttpHeaders.AUTHORIZATION, hr).exchange());
        assertThat(mvc.get().uri("/api/catalogs/positions/items").exchange()).hasStatus(401);
    }

    // --- helpers ---

    private MvcTestResult list(String bearer, String catalog, String query) {
        return get(bearer, "/api/catalogs/" + catalog + "/items" + (query.isEmpty() ? "" : "?" + query));
    }

    private MvcTestResult get(String bearer, String path) {
        return mvc.get().uri(path).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    /** POST of a new item to {@code catalog}. */
    private MvcTestResult post(String bearer, String catalogOrAction, String json) {
        return mvc.post().uri("/api/catalogs/" + catalogOrAction + "/items")
                .header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json)
                .exchange();
    }

    /** POST of an action on an item, e.g. {@code skills/items/{id}/deactivate}. */
    private MvcTestResult post(String bearer, String action) {
        return mvc.post().uri("/api/catalogs/" + action).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    private MvcTestResult put(String bearer, String catalog, String id, String json) {
        return mvc.put().uri("/api/catalogs/" + catalog + "/items/" + id)
                .header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json)
                .exchange();
    }

    private static void assertInvalid(MvcTestResult result, String field) {
        assertThat(result).hasStatus(400);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo(field);
    }

    private static void assertConflict(MvcTestResult result, String code) {
        assertThat(result).hasStatus(409);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo(code);
    }

    private static void assertNotFound(MvcTestResult result) {
        assertThat(result).hasStatus(404);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("catalog.not_found");
    }

    private static void assertForbidden(MvcTestResult result) {
        assertThat(result).hasStatus(403);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
    }

    private static String id(MvcTestResult result) {
        return JsonPath.read(body(result), "$.id");
    }

    private static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString();
        } catch (UnsupportedEncodingException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
