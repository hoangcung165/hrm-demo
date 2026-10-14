package com.hrmdemo.controller.resource;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.UnsupportedEncodingException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import javax.sql.DataSource;

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
 * The resource heatmap and the cell detail (HRM-17/BE-2) against real PostgreSQL, on the people of the approved #17
 * artboards. Dates are relative to today. Cao Minh Trí is 60% on DA-029 until {@code T+21} and 60% on DA-031 from
 * {@code T+4}: 120% from {@code T+4} to {@code T+21}.
 */
@IntegrationTest
class ResourceHeatmapApiIT {

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
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("delete from resource_setting");
        testEmployees.deleteAll();
        jdbc.update("delete from catalog_item where catalog = 'PROJECT_ROLE' and code like 'ZR%'");
        jdbc.update("delete from org_unit");
    }

    @Test
    void theHeatmapListsEveryActiveEmployeeWithTheirHighestLoadPerWeekOverloadedFirst() {
        MvcTestResult heatmap = get(lanBearer, "/api/resources/heatmap");

        assertThat(heatmap).hasStatusOk();
        assertThat(heatmap).bodyJson().extractingPath("$.granularity").isEqualTo("WEEK");
        assertThat(heatmap).bodyJson().extractingPath("$.columns").asArray().hasSize(12);
        LocalDate first = LocalDate.parse(JsonPath.read(body(heatmap), "$.columns[0].from"));
        assertThat(first.getDayOfWeek().getValue()).isEqualTo(1);
        assertThat(first).isBeforeOrEqualTo(T).isAfter(T.minusDays(7));
        // Five active people: the person who left is not a row.
        assertThat(heatmap).bodyJson().extractingPath("$.total").isEqualTo(5);
        assertThat(heatmap).bodyJson().extractingPath("$.summary.people").isEqualTo(5);
        assertThat(heatmap).bodyJson().extractingPath("$.summary.overloadedInWindow").isEqualTo(1);
        assertThat((Integer) JsonPath.read(body(heatmap), "$.summary.overloadedNow")).isBetween(0, 1);
        assertThat(strings(heatmap, "$.items[*].employee.fullName")).containsExactly("Cao Minh Trí",
                "Trần Thị Mai", "Phan Khánh Duy", "Nguyễn Văn An", "Vũ Thị Lan");
        assertThat(heatmap).bodyJson().extractingPath("$.items[0].peak").isEqualTo(120);
        assertThat(JsonPath.<List<Integer>>read(body(heatmap), "$.items[0].cells")).hasSize(12).contains(120);
        assertThat(heatmap).bodyJson().extractingPath("$.items[3].peak").isEqualTo(0);
        assertThat(heatmap).bodyJson().extractingPath("$.thresholds.benchPercent").isEqualTo(50);
        assertThat(heatmap).bodyJson().extractingPath("$.thresholds.nearFullPercent").isEqualTo(90);
    }

    @Test
    void filtersSortAndPagingWork() {
        assertThat(strings(get(lanBearer, "/api/resources/heatmap?level=OVER"), "$.items[*].employee.fullName"))
                .containsExactly("Cao Minh Trí");
        MvcTestResult bench = get(lanBearer, "/api/resources/heatmap?level=BENCH&sort=NAME");
        assertThat(strings(bench, "$.items[*].employee.fullName")).containsExactly("Nguyễn Văn An",
                "Phan Khánh Duy", "Vũ Thị Lan");
        assertThat(bench).bodyJson().extractingPath("$.summary.people").isEqualTo(5);
        assertThat(strings(get(lanBearer, "/api/resources/heatmap?q=tri"), "$.items[*].employee.fullName"))
                .containsExactly("Cao Minh Trí");
        assertThat(strings(get(lanBearer, "/api/resources/heatmap?orgUnitId=" + department),
                "$.items[*].employee.fullName")).containsExactly("Cao Minh Trí", "Phan Khánh Duy", "Vũ Thị Lan");

        MvcTestResult second = get(lanBearer, "/api/resources/heatmap?size=2&page=1&sort=NAME");
        assertThat(second).bodyJson().extractingPath("$.total").isEqualTo(5);
        assertThat(strings(second, "$.items[*].employee.fullName")).containsExactly("Phan Khánh Duy",
                "Trần Thị Mai");

        MvcTestResult months = get(lanBearer, "/api/resources/heatmap?granularity=MONTH&columns=3");
        assertThat(months).bodyJson().extractingPath("$.columns").asArray().hasSize(3);
        assertThat(months).bodyJson().extractingPath("$.columns[0].from")
                .isEqualTo(T.withDayOfMonth(1).toString());
    }

    @Test
    void theThresholdsInForceDecideTheLevelFilter() {
        // 30% for Duy is Bench with the default 50% and partial once the bench threshold is 25%.
        assertThat(strings(get(lanBearer, "/api/resources/heatmap?level=PARTIAL"), "$.items[*].employee.fullName"))
                .containsExactly("Trần Thị Mai");
        jdbc.update("""
                insert into resource_setting (id, legal_entity_id, bench_percent, near_full_percent, ending_weeks,
                    updated_at) values (?, (select id from legal_entity), 25, 90, 4, now())""", UUID.randomUUID());

        MvcTestResult partial = get(lanBearer, "/api/resources/heatmap?level=PARTIAL");
        assertThat(strings(partial, "$.items[*].employee.fullName")).containsExactly("Trần Thị Mai",
                "Phan Khánh Duy");
        assertThat(partial).bodyJson().extractingPath("$.thresholds.benchPercent").isEqualTo(25);
    }

    @Test
    void theCellDetailNamesTheProjectsThatAddUpToAnOverload() {
        MvcTestResult cell = get(lanBearer, "/api/resources/employees/" + tri + "/load?from=" + T.plusDays(4)
                + "&to=" + T.plusDays(10));

        assertThat(cell).hasStatusOk();
        assertThat(cell).bodyJson().extractingPath("$.employee.fullName").isEqualTo("Cao Minh Trí");
        assertThat(cell).bodyJson().extractingPath("$.peak").isEqualTo(120);
        assertThat(cell).bodyJson().extractingPath("$.overloaded").isEqualTo(true);
        assertThat(cell).bodyJson().extractingPath("$.periods").asArray().hasSize(1);
        assertThat(strings(cell, "$.periods[0].parts[*].projectCode")).containsExactly("DA-029", "DA-031");
        assertThat(strings(cell, "$.allocations[*].projectCode")).containsExactly("DA-029", "DA-031");
        assertThat(strings(cell, "$.allocations[*].status")).containsExactly("RUNNING", "UPCOMING");
        assertThat(cell).bodyJson().extractingPath("$.allocations[0].projectRole.name")
                .isEqualTo("Lập trình viên (test)");
        assertThat(cell).bodyJson().extractingPath("$.nextAllocation").isNull();
        // Without "to" the cell is one week.
        assertThat(get(lanBearer, "/api/resources/employees/" + tri + "/load?from=" + T)).bodyJson()
                .extractingPath("$.to").isEqualTo(T.plusDays(6).toString());
    }

    @Test
    void aWeekWithoutAllocationsSaysWhatComesNext() {
        MvcTestResult cell = get(maiBearer, "/api/resources/employees/" + mai + "/load?from=" + T);

        assertThat(cell).hasStatusOk();
        assertThat(cell).bodyJson().extractingPath("$.peak").isEqualTo(0);
        assertThat(cell).bodyJson().extractingPath("$.overloaded").isEqualTo(false);
        assertThat(cell).bodyJson().extractingPath("$.periods").asArray().isEmpty();
        assertThat(cell).bodyJson().extractingPath("$.allocations").asArray().isEmpty();
        assertThat(cell).bodyJson().extractingPath("$.nextAllocation.projectCode").isEqualTo("DA-029");
        assertThat(cell).bodyJson().extractingPath("$.nextAllocation.percent").isEqualTo(50);
        assertThat(cell).bodyJson().extractingPath("$.nextAllocation.startDate")
                .isEqualTo(T.plusDays(30).toString());
    }

    @Test
    void permissionsAndBadRequests() {
        assertThat(get(maiBearer, "/api/resources/heatmap")).hasStatusOk();
        assertThat(get(anBearer, "/api/resources/heatmap")).hasStatus(403);
        assertThat(get(anBearer, "/api/resources/employees/" + tri + "/load?from=" + T)).hasStatus(403);
        assertThat(mvc.get().uri("/api/resources/heatmap").exchange()).hasStatus(401);

        MvcTestResult invalid = get(lanBearer, "/api/resources/heatmap?granularity=DAY&columns=13&size=500");
        assertThat(invalid).hasStatus(400);
        assertThat(invalid).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(strings(invalid, "$.errors[*].field")).containsExactly("granularity", "columns", "size");

        assertThat(get(lanBearer, "/api/resources/employees/" + tri + "/load")).hasStatus(400);
        assertThat(get(lanBearer, "/api/resources/employees/" + UUID.randomUUID() + "/load?from=" + T))
                .hasStatus(404);
        assertThat(get(lanBearer, "/api/resources/employees/" + left + "/load?from=" + T)).hasStatus(404);
    }

    // --- helpers ---

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
