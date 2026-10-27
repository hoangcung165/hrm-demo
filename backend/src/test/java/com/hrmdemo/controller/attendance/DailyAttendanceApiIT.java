package com.hrmdemo.controller.attendance;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Công theo ngày against real PostgreSQL. Unit AP (default shift 08:00-17:00, lunch 12:00-13:00, 5 minutes of
 * tolerance) holds An, Bình and Chi; unit AO holds Dũng. The week used is two weeks back (Monday to Friday), so every
 * day of it is closed. An is on time Monday, 20 minutes late Tuesday, misses his Out Wednesday and is absent Thursday;
 * Friday he works a full day, which also makes Friday the last day the log covers. Bình never punches. Chi works the
 * night shift on Monday.
 */
@IntegrationTest
class DailyAttendanceApiIT {

    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    UUID ap;
    UUID ao;
    UUID an;
    UUID binh;
    UUID chi;
    UUID dung;
    String hr;
    String lineManager;
    String anBearer;
    LocalDate monday;
    String night;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        ap = unit("AP");
        ao = unit("AO");
        an = testEmployees.create("Nguyễn Văn An", ap);
        binh = testEmployees.create("Trần Thị Bình", ap);
        chi = testEmployees.create("Lê Chi", ap);
        dung = testEmployees.create("Phạm Dũng", ao);
        UUID head = testEmployees.create("Vũ Trưởng", ap);
        testEmployees.makeHead(ap, head);
        hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));
        TestAccounts.TestAccount manager = testAccounts.create(Role.LINE_MANAGER);
        testEmployees.link(manager.id(), head);
        lineManager = testAccounts.bearer(mvc, manager);
        TestAccounts.TestAccount anAccount = testAccounts.create(Role.EMPLOYEE);
        testEmployees.link(anAccount.id(), an);
        anBearer = testAccounts.bearer(mvc, anAccount);

        jdbc.update("delete from work_schedule");
        monday = LocalDate.now().minusDays(14);
        while (monday.getDayOfWeek() != DayOfWeek.MONDAY) {
            monday = monday.minusDays(1);
        }
        String day = shift("ZAT-DAY", "08:00", "17:00", "\"breakStart\": \"12:00\", \"breakEnd\": \"13:00\", "
                + "\"lateToleranceMinutes\": 5, \"earlyToleranceMinutes\": 5, \"roundingMode\": \"NONE\"");
        night = shift("ZAT-NIGHT", "22:00", "06:00", "\"lateToleranceMinutes\": 0, \"earlyToleranceMinutes\": 0, "
                + "\"roundingMode\": \"NONE\"");
        assertThat(send("put", "/api/org-units/" + ap + "/default-shift", hr, "{\"shiftId\": \"" + day + "\"}"))
                .hasStatusOk();
        assertThat(send("put", "/api/org-units/" + ao + "/default-shift", hr, "{\"shiftId\": \"" + day + "\"}"))
                .hasStatusOk();
        assertThat(send("put", "/api/shift-assignments", hr, """
                {"shiftId": "%s", "employeeIds": ["%s"], "from": "%s", "to": "%s"}""".formatted(night, chi, monday,
                monday))).hasStatusOk();

        punch(an, monday, 7, 58);
        punch(an, monday, 17, 2);
        punch(an, monday.plusDays(1), 8, 20);
        punch(an, monday.plusDays(1), 17, 0);
        punch(an, monday.plusDays(2), 8, 0);
        punch(an, monday.plusDays(4), 8, 0);
        punch(an, monday.plusDays(4), 17, 0);
        punch(chi, monday, 21, 58);
        punch(chi, monday.plusDays(1), 6, 2);
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("update org_unit set default_shift_id = null");
        jdbc.update("delete from org_unit");
        jdbc.update("delete from shift where code like 'ZAT%'");
    }

    @Test
    void anAppearsWithHisLateMissingAndAbsentDaysAndTotals() {
        String body = body(daily(hr, "&employeeId=" + an));

        assertThat(JsonPath.<Integer>read(body, "$.total")).isEqualTo(1);
        assertThat(JsonPath.<String>read(body, "$.rows[0].employee.fullName")).isEqualTo("Nguyễn Văn An");
        assertThat(this.<Integer>one(body, dayPath(0) + ".lateMinutes")).isZero();
        assertThat(this.<Integer>one(body, dayPath(1) + ".lateMinutes")).isEqualTo(20);
        assertThat(this.<List<String>>one(body, dayPath(2) + ".flags")).containsExactly("MISSING_OUT");
        assertThat(this.<List<String>>one(body, dayPath(3) + ".flags")).containsExactly("ABSENT");
        // Monday 7:58 to 17:02 is 8 hours of work: the break is taken off, time outside the shift is not counted.
        assertThat(this.<Integer>one(body, dayPath(0) + ".workedMinutes")).isEqualTo(480);
        assertThat(JsonPath.<Integer>read(body, "$.rows[0].totals.workedDays")).isEqualTo(3);
        assertThat(JsonPath.<Integer>read(body, "$.rows[0].totals.lateDays")).isEqualTo(1);
        assertThat(JsonPath.<Integer>read(body, "$.rows[0].totals.missingPunchDays")).isEqualTo(1);
        assertThat(JsonPath.<Integer>read(body, "$.rows[0].totals.absentDays")).isEqualTo(1);
        assertThat(JsonPath.<String>read(body, "$.coveredUntil")).startsWith(monday.plusDays(4) + "T17:00");
    }

    @Test
    void aNightShiftSitsOnItsStartDayWithTheOutOfTheNextMorning() {
        String body = body(get("/api/attendance/daily?from=" + monday + "&to=" + monday + "&employeeId=" + chi, hr));

        assertThat(JsonPath.<String>read(body, "$.rows[0].days[0].in")).startsWith(monday + "T21:58");
        assertThat(JsonPath.<String>read(body, "$.rows[0].days[0].out")).startsWith(monday.plusDays(1) + "T06:02");
        assertThat(JsonPath.<Integer>read(body, "$.rows[0].days[0].workedMinutes")).isEqualTo(480);
        assertThat(JsonPath.<String>read(body, "$.rows[0].days[0].shiftId")).isEqualTo(night);
        assertThat(JsonPath.<Integer>read(body, "$.rows[0].days.length()")).isEqualTo(1);
    }

    @Test
    void abnormalOnlyKeepsTheAbnormalDaysAndTheMostAbnormalEmployeeComesFirst() {
        String body = body(daily(hr, "&abnormalOnly=true&orgUnitId=" + ap));

        // Bình is absent all five days, An has three abnormal days, Chi has none on Monday and four absent days after.
        List<String> names = JsonPath.read(body, "$.rows[*].employee.fullName");
        assertThat(names.get(0)).isIn("Trần Thị Bình", "Lê Chi", "Vũ Trưởng");
        assertThat(names).contains("Nguyễn Văn An");
        assertThat(this.<List<?>>one(body, "$.rows[?(@.employee.fullName == 'Nguyễn Văn An')].days")).hasSize(3);
        assertThat(this.<Integer>one(body, "$.rows[?(@.employee.fullName == 'Nguyễn Văn An')].totals.workedDays"))
                .isEqualTo(3);

        String byName = body(daily(hr, "&sort=name&orgUnitId=" + ap));
        assertThat(JsonPath.<List<String>>read(byName, "$.rows[*].employee.fullName"))
                .isSorted();
    }

    @Test
    void searchIgnoresAccents() {
        String body = body(daily(hr, "&q=nguyen van"));

        assertThat(JsonPath.<List<String>>read(body, "$.rows[*].employee.fullName")).containsExactly("Nguyễn Văn An");
    }

    @Test
    void scopeFollowsThePermission() {
        // The Line manager heads AP, so Dũng (AO) is out of sight.
        List<String> managerSees = JsonPath.read(body(daily(lineManager, "")), "$.rows[*].employee.fullName");
        assertThat(managerSees).contains("Nguyễn Văn An", "Lê Chi").doesNotContain("Phạm Dũng");

        // An has no ATTENDANCE_VIEW: only his own days.
        String own = body(daily(anBearer, ""));
        assertThat(JsonPath.<List<String>>read(own, "$.rows[*].employee.fullName")).containsExactly("Nguyễn Văn An");
        assertThat(JsonPath.<Integer>read(own, "$.total")).isEqualTo(1);
    }

    @Test
    void daysTheLogDoesNotCoverAreNotJudged() {
        LocalDate next = monday.plusDays(7);
        // Punches exist up to the Friday two weeks back, so the week after starts after coveredUntil.
        punch(binh, monday.plusDays(4), 8, 0);
        MvcTestResult result = get("/api/attendance/daily?from=" + next + "&to=" + next.plusDays(4) + "&employeeId=" + binh,
                hr);
        String body = body(result);

        assertThat(JsonPath.<List<Boolean>>read(body, "$.rows[0].days[*].noLog")).isNotEmpty().containsOnly(true);
        assertThat(JsonPath.<List<List<String>>>read(body, "$.rows[0].days[*].flags")).allMatch(List::isEmpty);
        assertThat(JsonPath.<Integer>read(body, "$.rows[0].totals.absentDays")).isZero();
    }

    @Test
    void rangesAndSortAreValidated() {
        assertThat(get("/api/attendance/daily?from=" + monday + "&to=" + monday.plusDays(62), hr)).hasStatus(400);
        assertThat(get("/api/attendance/daily?from=" + monday + "&to=" + monday.minusDays(1), hr)).hasStatus(400);
        assertThat(daily(hr, "&sort=age")).hasStatus(400);
        assertThat(get("/api/attendance/daily", hr)).hasStatus(400);
    }

    @Test
    void needsSignIn() {
        assertThat(mvc.get().uri("/api/attendance/daily?from=" + monday + "&to=" + monday).exchange()).hasStatus(401);
    }

    /** The one match of a filter path (a filter always answers with a list). */
    private <T> T one(String body, String path) {
        List<T> matches = JsonPath.read(body, path);
        assertThat(matches).hasSize(1);
        return matches.get(0);
    }

    private String dayPath(int offset) {
        return "$.rows[0].days[?(@.date == '" + monday.plusDays(offset) + "')]";
    }

    MvcTestResult daily(String bearer, String extra) {
        return get("/api/attendance/daily?from=" + monday + "&to=" + monday.plusDays(4) + extra, bearer);
    }

    void punch(UUID employee, LocalDate day, int hour, int minute) {
        OffsetDateTime at = day.atTime(hour, minute).atZone(ZONE).toOffsetDateTime();
        jdbc.update("""
                insert into punch (id, legal_entity_id, employee_id, punched_at, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, now(), now())""", UUID.randomUUID(), employee, at);
    }

    UUID unit(String code) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, ?, ?, 'TEAM', now(), now())""", id, code, code);
        return id;
    }

    String shift(String code, String start, String end, String rest) {
        MvcTestResult created = send("post", "/api/shifts", hr, """
                {"code": "%s", "name": "%s", "startTime": "%s", "endTime": "%s", %s}""".formatted(code, code, start, end,
                rest));
        assertThat(created).hasStatus(201);
        return JsonPath.read(body(created), "$.id");
    }

    MvcTestResult get(String uri, String bearer) {
        return mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult send(String method, String uri, String bearer, String json) {
        var builder = "post".equals(method) ? mvc.post() : mvc.put();
        return builder.uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).contentType(MediaType.APPLICATION_JSON)
                .content(json).exchange();
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
