package com.hrmdemo.controller.resource;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Load test of the resource views (HRM-17/INT-1): 700 active Employees, 24 projects and about 1,400 allocations
 * against real PostgreSQL, then every read of the Nguồn lực screens. Each call is measured three times after a
 * warm-up call and the median must stay under {@link #BUDGET_MS}; the numbers go to
 * {@code build/reports/resource-load.txt}, which CI prints. The budget is generous on purpose: it catches a query that
 * stops scaling (a loop of queries per Employee, a missing index), not a slow runner. The heatmap pages 50 rows at a
 * time, so what the browser draws stays small however many Employees there are.
 */
@IntegrationTest
class ResourceLoadIT {

    static final LocalDate T = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    static final int EMPLOYEES = 700;
    static final int PROJECTS = 24;
    static final long BUDGET_MS = 2_000;

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
    UUID role;
    String bearer;
    List<UUID> people;
    final Map<String, Long> timings = new LinkedHashMap<>();

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        department = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, 'ZLOAD', 'Phòng tải thử', 'DEPARTMENT', now(), now())""",
                department);
        role = UUID.randomUUID();
        jdbc.update("""
                insert into catalog_item (id, legal_entity_id, catalog, code, name, search_text, active, created_at,
                    updated_at)
                values (?, (select id from legal_entity), 'PROJECT_ROLE', 'ZRLOAD', 'Vai trò tải thử', 'zrload', true,
                    now(), now())""", role);
        people = insertEmployees();
        List<UUID> projects = new ArrayList<>();
        for (int i = 1; i <= PROJECTS; i++) {
            UUID id = UUID.randomUUID();
            jdbc.update("""
                    insert into project (id, legal_entity_id, code, name, client, search_text, pm_employee_id,
                        org_unit_id, start_date, end_date, status, created_at, updated_at)
                    values (?, (select id from legal_entity), ?, ?, null, ?, ?, ?, ?, ?, 'ACTIVE', now(), now())""",
                    id, "ZL-%03d".formatted(i), "Du an tai thu %d".formatted(i), "zl-%03d du an tai thu".formatted(i),
                    people.get(0), department, Date.valueOf(T.minusDays(300)), Date.valueOf(T.plusDays(300)));
            projects.add(id);
        }
        List<Object[]> rows = new ArrayList<>();
        for (int i = 0; i < EMPLOYEES; i++) {
            // About 1,400 allocations. Every 10th Employee has none (Bench), every 25th is over 100% in the next
            // weeks, every 7th has one ending within the next four weeks.
            if (i % 10 == 9) {
                continue;
            }
            rows.add(row(projects.get(i % PROJECTS), people.get(i), 40 + (i % 3) * 20, -90, 30 + (i % 70)));
            rows.add(row(projects.get((i + 7) % PROJECTS), people.get(i), i % 25 == 0 ? 70 : 30 + (i % 2) * 20,
                    i % 25 == 0 ? 5 : -60, i % 7 == 0 ? 10 + (i % 18) : 120));
        }
        jdbc.batchUpdate("""
                insert into project_allocation (id, legal_entity_id, project_id, employee_id, project_role_id, percent,
                    start_date, end_date, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, ?, ?, ?, ?, now(), now())""", rows);
        bearer = signedInAdmin();
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("delete from resource_setting");
        testEmployees.deleteAll();
        jdbc.update("delete from catalog_item where catalog = 'PROJECT_ROLE' and code = 'ZRLOAD'");
        jdbc.update("delete from org_unit");
    }

    @Test
    void everyResourceReadStaysFastWith700Employees() {
        assertThat(jdbc.queryForObject("select count(*) from project_allocation", Integer.class)).isGreaterThan(1_000);

        MvcTestResult first = measure("heatmap, first page (12 weeks, highest load first)", "/api/resources/heatmap");
        assertThat(first).bodyJson().extractingPath("$.total").isEqualTo(EMPLOYEES);
        assertThat(JsonPath.<List<?>>read(body(first), "$.items")).hasSize(50);
        assertThat(JsonPath.<Integer>read(body(first), "$.items[0].peak")).isGreaterThan(100);

        MvcTestResult last = measure("heatmap, last page", "/api/resources/heatmap?page=13");
        assertThat(JsonPath.<List<?>>read(body(last), "$.items")).hasSize(EMPLOYEES - 13 * 50);
        measure("heatmap, month view (6 months)", "/api/resources/heatmap?granularity=MONTH&columns=6");
        MvcTestResult over = measure("heatmap, level Quá tải", "/api/resources/heatmap?level=OVER");
        assertThat(JsonPath.<Integer>read(body(over), "$.total")).isGreaterThan(10);
        MvcTestResult search = measure("heatmap, search", "/api/resources/heatmap?q=nhan vien 0123");
        assertThat(JsonPath.<Integer>read(body(search), "$.total")).isEqualTo(1);
        measure("heatmap, by department sorted by name", "/api/resources/heatmap?orgUnitId=" + department + "&sort=NAME");
        measure("cell detail", "/api/resources/employees/" + people.get(0) + "/load?from=" + T + "&to=" + T.plusDays(6));
        MvcTestResult bench = measure("bench, this week", "/api/resources/bench");
        assertThat(JsonPath.<Integer>read(body(bench), "$.total")).isGreaterThan(0);
        MvcTestResult ending = measure("ending soon", "/api/resources/ending");
        assertThat(JsonPath.<Integer>read(body(ending), "$.summary.endingSoon")).isGreaterThan(0);
        measure("overview", "/api/resources/overview");
        measure("employee projects (profile tab)", "/api/employees/" + people.get(1) + "/projects");

        report();
        assertThat(timings).allSatisfy((label, ms) -> assertThat(ms).as(label).isLessThan(BUDGET_MS));
    }

    // --- helpers ---

    /**
     * 700 active Employees in one batch. {@code TestEmployees.create} draws random codes, which would collide now and
     * then at this size; these are numbered ("NV9000001"), so they never meet a code the server issues.
     */
    List<UUID> insertEmployees() {
        UUID position = testEmployees.position();
        List<UUID> ids = new ArrayList<>();
        List<Object[]> rows = new ArrayList<>();
        for (int i = 1; i <= EMPLOYEES; i++) {
            UUID id = UUID.randomUUID();
            String code = "NV9%06d".formatted(i);
            String name = "Nhan Vien %04d".formatted(i);
            ids.add(id);
            rows.add(new Object[] {id, code, name, name.toLowerCase() + " " + code.toLowerCase(),
                    "%012d".formatted(i), department, position});
        }
        jdbc.batchUpdate("""
                insert into employee (id, legal_entity_id, code, full_name, search_text, date_of_birth, gender,
                    id_number, org_unit_id, position_id, hire_date, status, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, ?, date '1990-01-01', 'FEMALE', ?, ?, ?,
                    date '2020-01-01', 'OFFICIAL', now(), now())""", rows);
        return ids;
    }

    /** Warm-up call, then the median of three calls; also checks the status. */
    MvcTestResult measure(String label, String uri) {
        MvcTestResult result = get(uri);
        assertThat(result).as(label).hasStatusOk();
        long[] ms = new long[3];
        for (int i = 0; i < ms.length; i++) {
            long start = System.nanoTime();
            assertThat(get(uri)).as(label).hasStatusOk();
            ms[i] = (System.nanoTime() - start) / 1_000_000;
        }
        java.util.Arrays.sort(ms);
        timings.put(label, ms[1]);
        return result;
    }

    void report() {
        List<String> lines = new ArrayList<>();
        lines.add("Resource load test: %d Employees, %d projects, %d allocations, %s".formatted(EMPLOYEES, PROJECTS,
                jdbc.queryForObject("select count(*) from project_allocation", Integer.class), Instant.now()));
        timings.forEach((label, ms) -> lines.add("%6d ms  %s".formatted(ms, label)));
        lines.add("Budget per call: %d ms (median of three, after a warm-up call)".formatted(BUDGET_MS));
        try {
            Path file = Path.of("build", "reports", "resource-load.txt");
            Files.createDirectories(file.getParent());
            Files.write(file, lines);
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    /** One allocation row; {@code from} and {@code to} are days from today. */
    Object[] row(UUID project, UUID employee, int percent, int from, int to) {
        return new Object[] {UUID.randomUUID(), project, employee, role, percent, Date.valueOf(T.plusDays(from)),
                Date.valueOf(T.plusDays(to))};
    }

    String signedInAdmin() {
        TestAccount account = testAccounts.create(Role.ADMIN);
        return testAccounts.bearer(mvc, account);
    }

    MvcTestResult get(String uri) {
        return mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString();
        } catch (java.io.UnsupportedEncodingException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
