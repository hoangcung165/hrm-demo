package com.hrmdemo.controller.attendance;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
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
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Load test of Công theo ngày (HRM-23/BE-3): 700 active Employees in one department with a Ca mặc định, a 31-day range
 * in the past with an In and an Out punch on every working day (every 5th Employee is 20 minutes late on every one),
 * against real PostgreSQL. Each read is measured three times after a warm-up call and the median must stay under
 * {@link #BUDGET_MS}; the numbers go to {@code build/reports/attendance-daily-load.txt}, which CI prints. The budget is
 * generous on purpose: it catches a query per Employee or per day, not a slow runner.
 */
@IntegrationTest
class DailyAttendanceLoadIT {

    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final LocalDate T = LocalDate.now(ZONE);
    static final int EMPLOYEES = 700;
    static final int DAYS = 31;
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
    String bearer;
    LocalDate from;
    LocalDate to;
    int punchRows;
    final Map<String, Long> timings = new LinkedHashMap<>();

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        jdbc.update("delete from work_schedule");
        to = T.minusDays(3);
        from = to.minusDays(DAYS - 1);
        bearer = testAccounts.bearer(mvc, testAccounts.create(Role.ADMIN));
        // Created through the API: a raw insert of a time column is read back in another zone.
        MvcTestResult created = mvc.post().uri("/api/shifts").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON).content("""
                        {"code": "ZLOAD-ATT", "name": "ZLOAD-ATT", "startTime": "08:00", "endTime": "17:00",
                         "breakStart": "12:00", "breakEnd": "13:00", "lateToleranceMinutes": 5,
                         "earlyToleranceMinutes": 5, "roundingMode": "NONE"}""").exchange();
        assertThat(created).hasStatus(201);
        UUID shift = UUID.fromString(JsonPath.read(body(created), "$.id"));
        department = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, default_shift_id, created_at,
                    updated_at)
                values (?, (select id from legal_entity), null, 'ZLOADA', 'Phòng tải thử', 'DEPARTMENT', ?, now(), now())""",
                department, shift);
        List<UUID> people = insertEmployees();
        List<Object[]> rows = new ArrayList<>();
        for (int i = 0; i < people.size(); i++) {
            int lateMinutes = i % 5 == 0 ? 20 : 0;
            for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
                if (day.getDayOfWeek() != DayOfWeek.SATURDAY && day.getDayOfWeek() != DayOfWeek.SUNDAY) {
                    rows.add(new Object[] {UUID.randomUUID(), people.get(i), at(day, 8, lateMinutes)});
                    rows.add(new Object[] {UUID.randomUUID(), people.get(i), at(day, 17, 0)});
                }
            }
        }
        punchRows = rows.size();
        jdbc.batchUpdate("""
                insert into punch (id, legal_entity_id, employee_id, punched_at, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, now(), now())""", rows);
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("update org_unit set default_shift_id = null");
        jdbc.update("delete from org_unit");
        jdbc.update("delete from shift where code like 'ZLOAD%'");
    }

    @Test
    void dailyAttendanceStaysFastWith700EmployeesAnd31Days() {
        String range = "from=" + from + "&to=" + to;

        MvcTestResult first = measure("daily, 31 days, first page of 50", "/api/attendance/daily?" + range + "&size=50");
        assertThat(JsonPath.<Integer>read(body(first), "$.total")).isEqualTo(EMPLOYEES);
        assertThat(JsonPath.<List<?>>read(body(first), "$.rows")).hasSize(50);
        // The most abnormal first: the late fifth of the Employees, every working day.
        assertThat(JsonPath.<Integer>read(body(first), "$.rows[0].totals.lateDays")).isGreaterThan(15);

        MvcTestResult all = measure("daily, 31 days, 500 Employees in one page", "/api/attendance/daily?" + range
                + "&size=500");
        assertThat(JsonPath.<List<?>>read(body(all), "$.rows")).hasSize(500);
        List<Integer> dayCounts = JsonPath.read(body(all), "$.rows[*].days.length()");
        assertThat(dayCounts).allSatisfy(count -> assertThat(count).isBetween(20, 23));

        MvcTestResult abnormal = measure("daily, only abnormal days", "/api/attendance/daily?" + range
                + "&abnormalOnly=true&size=500");
        assertThat(JsonPath.<Integer>read(body(abnormal), "$.total")).isEqualTo(EMPLOYEES / 5);

        measure("daily, by name with a search", "/api/attendance/daily?" + range + "&sort=name&q=0007");
        report();
        assertThat(timings).allSatisfy((label, ms) -> assertThat(ms).as(label).isLessThan(BUDGET_MS));
    }

    // --- helpers ---

    static OffsetDateTime at(LocalDate day, int hour, int minute) {
        return day.atTime(hour, 0).plusMinutes(minute).atZone(ZONE).toOffsetDateTime();
    }

    /** 700 active Employees in one batch, numbered so their codes never meet one the server issues. */
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
        Arrays.sort(ms);
        timings.put(label, ms[1]);
        return result;
    }

    void report() {
        List<String> lines = new ArrayList<>();
        lines.add("Daily attendance load test: %d Employees, %d days, %d punches, %s".formatted(EMPLOYEES, DAYS, punchRows,
                Instant.now()));
        timings.forEach((label, ms) -> lines.add("%6d ms  %s".formatted(ms, label)));
        lines.add("Budget per call: %d ms (median of three, after a warm-up call)".formatted(BUDGET_MS));
        try {
            Path file = Path.of("build", "reports", "attendance-daily-load.txt");
            Files.createDirectories(file.getParent());
            Files.write(file, lines);
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
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
