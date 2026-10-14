package com.hrmdemo.controller.project;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.UnsupportedEncodingException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.SearchText;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * The "Dự án" tab of an Employee's profile (HRM-17/BE-4) against real PostgreSQL, on the people of the approved #17
 * artboards. Dates are relative to today. Cao Minh Trí is 60% on DA-029 until {@code T+21} and 60% on DA-031 from
 * {@code T+4}: 120% from {@code T+4} to {@code T+21}.
 */
@IntegrationTest
@SuppressWarnings("unchecked")
class EmployeeProjectsApiIT {

    static final LocalDate T = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    UUID department;
    UUID lan;
    UUID tri;
    UUID duy;
    UUID an;
    UUID mai;
    UUID left;
    UUID dev;
    String lanBearer;
    String maiBearer;
    String anBearer;
    String da031;
    String da029;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        jdbc.update("delete from resource_setting");
        testEmployees.deleteAll();
        jdbc.update("delete from catalog_item where catalog = 'PROJECT_ROLE' and code like 'ZR%'");
        jdbc.update("delete from org_unit");
        department = unit("PTPM", "Phòng Phát triển phần mềm");
        lan = testEmployees.create("Vũ Thị Lan", department);
        tri = testEmployees.create("Cao Minh Trí", department);
        duy = testEmployees.create("Phan Khánh Duy", department);
        an = testEmployees.create("Nguyễn Văn An", null);
        mai = testEmployees.create("Trần Thị Mai", null);
        left = testEmployees.create("Người đã nghỉ", department, "INACTIVE");
        normalizeSearchText();
        dev = role("ZRDEV", "Lập trình viên (test)");
        lanBearer = signedIn(lan, Role.PROJECT_MANAGER);
        maiBearer = signedIn(mai, Role.HR);
        anBearer = signedIn(an, Role.EMPLOYEE);
        da031 = project("DA-031", "Ứng dụng đặt lịch khám", T.minusDays(40), T.plusDays(170));
        da029 = project("DA-029", "Cổng khách hàng bảo hiểm", T.minusDays(120), T.plusDays(60));
        allocate(da029, tri, 60, T.minusDays(100), T.plusDays(21));
        allocate(da031, tri, 60, T.plusDays(4), T.plusDays(80));
        allocate(da029, duy, 30, T.minusDays(10), T.plusDays(40));
        allocate(da029, mai, 50, T.plusDays(30), T.plusDays(60));
        allocate(da031, duy, 20, T.minusDays(35), T.minusDays(20));
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("delete from resource_setting");
        testEmployees.deleteAll();
        jdbc.update("delete from catalog_item where catalog = 'PROJECT_ROLE' and code like 'ZR%'");
        jdbc.update("delete from org_unit");
    }

    @Test
    void anEmployeeSeesTheirAllocationsNewestFirstWithTheProject() {
        MvcTestResult tab = get(maiBearer, "/api/employees/" + tri + "/projects");

        assertThat(tab).hasStatusOk();
        assertThat(strings(tab, "$.items[*].projectCode")).containsExactly("DA-031", "DA-029");
        assertThat(strings(tab, "$.items[*].status")).containsExactly("UPCOMING", "RUNNING");
        assertThat(tab).bodyJson().extractingPath("$.items[0].percent").isEqualTo(60);
        assertThat(tab).bodyJson().extractingPath("$.items[0].startDate").isEqualTo(T.plusDays(4).toString());
        assertThat(tab).bodyJson().extractingPath("$.items[0].projectName").isEqualTo("Ứng dụng đặt lịch khám");
        assertThat(tab).bodyJson().extractingPath("$.items[0].projectStatus").isEqualTo("ACTIVE");
        assertThat(tab).bodyJson().extractingPath("$.items[0].projectRole.name").isEqualTo("Lập trình viên (test)");
        assertThat(tab).bodyJson().extractingPath("$.items[0].pm.fullName").isEqualTo("Vũ Thị Lan");
    }

    @Test
    void pastRunningAndUpcomingAllocationsAreAllListed() {
        MvcTestResult tab = get(maiBearer, "/api/employees/" + duy + "/projects");

        // Running DA-029 started 10 days ago; the DA-031 allocation ended 20 days ago.
        assertThat(strings(tab, "$.items[*].projectCode")).containsExactly("DA-029", "DA-031");
        assertThat(strings(tab, "$.items[*].status")).containsExactly("RUNNING", "ENDED");
        assertThat(tab).bodyJson().extractingPath("$.strip.overloaded").isEqualTo(false);
        assertThat(tab).bodyJson().extractingPath("$.strip.firstOverload").isNull();
    }

    @Test
    void theStripAndTheOverloadMatchTheHeatmap() {
        MvcTestResult tab = get(maiBearer, "/api/employees/" + tri + "/projects");
        MvcTestResult heatmap = get(maiBearer, "/api/resources/heatmap?q=tri");

        assertThat(tab).bodyJson().extractingPath("$.strip.cells").asArray().hasSize(12);
        assertThat(tab).bodyJson().extractingPath("$.strip.from")
                .isEqualTo(JsonPath.read(body(heatmap), "$.from"));
        assertThat((List<Integer>) JsonPath.read(body(tab), "$.strip.cells[*].peak"))
                .isEqualTo(JsonPath.read(body(heatmap), "$.items[0].cells"));
        assertThat(tab).bodyJson().extractingPath("$.strip.overloaded").isEqualTo(true);
        assertThat(tab).bodyJson().extractingPath("$.strip.firstOverload.totalPercent").isEqualTo(120);
        assertThat(tab).bodyJson().extractingPath("$.strip.firstOverload.from").isEqualTo(T.plusDays(4).toString());
        assertThat(tab).bodyJson().extractingPath("$.strip.firstOverload.to").isEqualTo(T.plusDays(21).toString());
        assertThat(strings(tab, "$.strip.firstOverload.parts[*].projectCode")).containsExactly("DA-029", "DA-031");
    }

    @Test
    void someoneWithoutAllocationsHasAnEmptyListAndAFlatStrip() {
        MvcTestResult tab = get(maiBearer, "/api/employees/" + an + "/projects");

        assertThat(tab).hasStatusOk();
        assertThat(tab).bodyJson().extractingPath("$.items").asArray().isEmpty();
        assertThat((List<Integer>) JsonPath.read(body(tab), "$.strip.cells[*].peak")).containsOnly(0);
        assertThat(tab).bodyJson().extractingPath("$.strip.overloaded").isEqualTo(false);
    }

    @Test
    void everyoneSeesTheirOwnTabButAnotherEmployeesNeedsTheProfileAndProjectRights() {
        // An is a plain Employee: own tab yes, someone else's no.
        assertThat(get(anBearer, "/api/employees/" + an + "/projects")).hasStatusOk();
        assertThat(get(anBearer, "/api/employees/" + tri + "/projects")).hasStatus(403);
        // A PM has PROJECT_VIEW but not EMPLOYEE_VIEW.
        assertThat(get(lanBearer, "/api/employees/" + tri + "/projects")).hasStatus(403);
        assertThat(get(lanBearer, "/api/employees/" + lan + "/projects")).hasStatusOk();
        // An accountant has EMPLOYEE_VIEW but not PROJECT_VIEW.
        UUID accountant = testEmployees.create("Lê Kế Toán", null);
        String accountantBearer = signedIn(accountant, Role.ACCOUNTANT);
        assertThat(get(accountantBearer, "/api/employees/" + tri + "/projects")).hasStatus(403);
        // HR has both.
        assertThat(get(maiBearer, "/api/employees/" + tri + "/projects")).hasStatusOk();

        assertThat(mvc.get().uri("/api/employees/" + tri + "/projects").exchange()).hasStatus(401);
        assertThat(get(maiBearer, "/api/employees/" + UUID.randomUUID() + "/projects")).hasStatus(404);
    }

    // --- helpers ---

    /** The shared test helper only lower-cases search_text; the real service stores it without accents. */
    void normalizeSearchText() {
        for (Map<String, Object> row : jdbc.queryForList("select id, full_name, code from employee")) {
            jdbc.update("update employee set search_text = ? where id = ?",
                    SearchText.of((String) row.get("full_name"), (String) row.get("code")), row.get("id"));
        }
    }

    String project(String code, String name, LocalDate from, LocalDate to) {
        MvcTestResult created = post(lanBearer, "/api/projects", """
                {"code":"%s","name":"%s","pmEmployeeId":"%s","orgUnitId":"%s","startDate":"%s","endDate":"%s",
                 "status":"ACTIVE"}""".formatted(code, name, lan, department, from, to));
        assertThat(created).hasStatus(201);
        return JsonPath.read(body(created), "$.id");
    }

    void allocate(String projectId, UUID employee, int percent, LocalDate from, LocalDate to) {
        assertThat(post(lanBearer, "/api/projects/" + projectId + "/allocations", """
                {"employeeId":"%s","projectRoleId":"%s","percent":%d,"startDate":"%s","endDate":"%s"}"""
                .formatted(employee, dev, percent, from, to))).hasStatus(201);
    }

    UUID unit(String code, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, ?, ?, 'DEPARTMENT', now(), now())""", id, code, name);
        return id;
    }

    UUID role(String code, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into catalog_item (id, legal_entity_id, catalog, code, name, search_text, active, created_at,
                    updated_at)
                values (?, (select id from legal_entity), 'PROJECT_ROLE', ?, ?, ?, true, now(), now())""",
                id, code, name, name.toLowerCase(Locale.ROOT) + " " + code.toLowerCase(Locale.ROOT));
        return id;
    }

    String signedIn(UUID employee, Role role) {
        TestAccount account = testAccounts.create(role);
        testEmployees.link(account.id(), employee);
        return testAccounts.bearer(mvc, account);
    }

    MvcTestResult get(String bearer, String uri) {
        return mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult post(String bearer, String uri, String body) {
        return mvc.post().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).contentType(MediaType.APPLICATION_JSON)
                .content(body).exchange();
    }

    static List<String> strings(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString();
        } catch (UnsupportedEncodingException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
