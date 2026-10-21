package com.hrmdemo.controller.shift;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Date;
import java.time.DayOfWeek;
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
 * Load test of the Lịch ca (HRM-22/BE-3): 700 active Employees in one department with a Ca mặc định, every 4th
 * Employee with their own Phân ca on every working day of a 31-day range, against real PostgreSQL. Each read is
 * measured three times after a warm-up call and the median must stay under {@link #BUDGET_MS}; the numbers go to
 * {@code build/reports/shift-calendar-load.txt}, which CI prints. The budget is generous on purpose: it catches a query
 * per Employee or per day, not a slow runner.
 */
@IntegrationTest
class ShiftCalendarLoadIT {

    static final LocalDate T = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
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
    UUID defaultShift;
    UUID otherShift;
    String bearer;
    LocalDate from;
    LocalDate to;
    int assignedRows;
    final Map<String, Long> timings = new LinkedHashMap<>();

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        jdbc.update("delete from work_schedule");
        from = T.plusDays(1);
        to = from.plusDays(DAYS - 1);
        defaultShift = shift("ZLOAD-DAY", "08:00", "17:00");
        otherShift = shift("ZLOAD-NIGHT", "22:00", "06:00");
        department = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, default_shift_id, created_at,
                    updated_at)
                values (?, (select id from legal_entity), null, 'ZLOAD', 'Phòng tải thử', 'DEPARTMENT', ?, now(), now())""",
                department, defaultShift);
        List<UUID> people = insertEmployees();
        List<Object[]> rows = new ArrayList<>();
        for (int i = 0; i < EMPLOYEES; i += 4) {
            for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
                if (day.getDayOfWeek() != DayOfWeek.SATURDAY && day.getDayOfWeek() != DayOfWeek.SUNDAY) {
                    rows.add(new Object[] {UUID.randomUUID(), people.get(i), Date.valueOf(day), otherShift});
                }
            }
        }
        assignedRows = rows.size();
        jdbc.batchUpdate("""
                insert into shift_assignment (id, legal_entity_id, employee_id, work_date, shift_id, created_at,
                    updated_at)
                values (?, (select id from legal_entity), ?, ?, ?, now(), now())""", rows);
        bearer = testAccounts.bearer(mvc, testAccounts.create(Role.ADMIN));
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("update org_unit set default_shift_id = null");
        jdbc.update("delete from org_unit");
        jdbc.update("delete from shift where code like 'ZLOAD%'");
    }

    @Test
    void theShiftCalendarStaysFastWith700EmployeesAnd31Days() {
        String range = "from=" + from + "&to=" + to;

        MvcTestResult first = measure("calendar, 31 days, first page of 50", "/api/shift-calendar?" + range);
        assertThat(first).bodyJson().extractingPath("$.total").isEqualTo(EMPLOYEES);
        assertThat(JsonPath.<List<?>>read(body(first), "$.rows")).hasSize(50);

        MvcTestResult all = measure("calendar, 31 days, 500 Employees in one page", "/api/shift-calendar?" + range
                + "&size=500");
        assertThat(JsonPath.<List<?>>read(body(all), "$.rows")).hasSize(500);
        MvcTestResult rest = measure("calendar, 31 days, the remaining 200", "/api/shift-calendar?" + range
                + "&size=500&page=1");
        assertThat(JsonPath.<List<?>>read(body(rest), "$.rows")).hasSize(EMPLOYEES - 500);
        // 22 working days at most in 31 days; every Employee has a shift on each of them, assigned or by default.
        List<Integer> cellCounts = JsonPath.read(body(all), "$.rows[*].cells.length()");
        assertThat(cellCounts).allSatisfy(count -> assertThat(count).isBetween(20, 23));
        MvcTestResult unit = measure("calendar, by department", "/api/shift-calendar?" + range + "&orgUnitId="
                + department + "&size=500");
        assertThat(JsonPath.<Integer>read(body(unit), "$.total")).isEqualTo(EMPLOYEES);
        MvcTestResult filtered = measure("calendar, only the assigned shift", "/api/shift-calendar?" + range
                + "&shiftId=" + otherShift + "&size=500");
        assertThat(JsonPath.<Integer>read(body(filtered), "$.total")).isEqualTo(EMPLOYEES / 4);

        report();
        assertThat(timings).allSatisfy((label, ms) -> assertThat(ms).as(label).isLessThan(BUDGET_MS));
    }

    // --- helpers ---

    UUID shift(String code, String start, String end) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into shift (id, legal_entity_id, code, name, start_time, end_time, late_tolerance_minutes,
                    early_tolerance_minutes, rounding_mode, active, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, ?::time, ?::time, 0, 0, 'NONE', true, now(), now())""",
                id, code, code, start, end);
        return id;
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
        java.util.Arrays.sort(ms);
        timings.put(label, ms[1]);
        return result;
    }

    void report() {
        List<String> lines = new ArrayList<>();
        lines.add("Shift calendar load test: %d Employees, %d days, %d assignments, %s".formatted(EMPLOYEES, DAYS,
                assignedRows, Instant.now()));
        timings.forEach((label, ms) -> lines.add("%6d ms  %s".formatted(ms, label)));
        lines.add("Budget per call: %d ms (median of three, after a warm-up call)".formatted(BUDGET_MS));
        try {
            Path file = Path.of("build", "reports", "shift-calendar-load.txt");
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
