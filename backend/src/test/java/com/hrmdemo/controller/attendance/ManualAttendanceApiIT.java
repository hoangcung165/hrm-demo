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
 * Công thủ công (HRM-24) against real PostgreSQL. Unit AM (default shift 08:00-17:00, lunch 12:00-13:00, 5 minutes of
 * tolerance) holds An, Bình and its head; unit AN holds Dũng. The week used is two weeks back, Monday to Sunday, so every
 * day of it is closed. An punched a late, short Monday (08:31 to 16:02) on the machine.
 */
@IntegrationTest
class ManualAttendanceApiIT {

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
    UUID am;
    UUID an;
    UUID binh;
    UUID dung;
    String hr;
    String lineManager;
    String anBearer;
    LocalDate monday;
    String night;
    int auditsBefore;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        am = unit("AM");
        UUID anUnit = unit("AN");
        an = testEmployees.create("Nguyễn Văn An", am);
        binh = testEmployees.create("Trần Thị Bình", am);
        dung = testEmployees.create("Phạm Dũng", anUnit);
        UUID head = testEmployees.create("Vũ Trưởng", am);
        testEmployees.makeHead(am, head);
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
        String day = shift("ZMA-DAY", "08:00", "17:00", "\"breakStart\": \"12:00\", \"breakEnd\": \"13:00\", "
                + "\"lateToleranceMinutes\": 5, \"earlyToleranceMinutes\": 5, \"roundingMode\": \"NONE\"");
        night = shift("ZMA-NIGHT", "22:00", "06:00", "\"lateToleranceMinutes\": 0, \"earlyToleranceMinutes\": 0, "
                + "\"roundingMode\": \"NONE\"");
        assertThat(send("put", "/api/org-units/" + am + "/default-shift", hr, "{\"shiftId\": \"" + day + "\"}"))
                .hasStatusOk();
        assertThat(send("put", "/api/org-units/" + anUnit + "/default-shift", hr, "{\"shiftId\": \"" + day + "\"}"))
                .hasStatusOk();

        auditsBefore = jdbc.queryForObject(
                "select count(*) from audit_log where entity_type = 'MANUAL_ATTENDANCE'", Integer.class);
        punch(an, monday, 8, 31);
        punch(an, monday, 16, 2);
        punch(an, monday.plusDays(4), 8, 0);
        punch(an, monday.plusDays(4), 17, 0);
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("update org_unit set default_shift_id = null");
        jdbc.update("delete from org_unit");
        jdbc.update("delete from shift where code like 'ZMA%'");
    }

    @Test
    void aFullDayReplacesThePunchesOfTheDayAndIsNeverAddedToThem() {
        MvcTestResult saved = save(hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s", "kind": "FULL", "note": "Đi công tác"}"""
                .formatted(an, monday, monday));
        assertThat(saved).hasStatusOk();
        assertThat(JsonPath.<Integer>read(body(saved), "$.created")).isEqualTo(1);

        String daily = body(get("/api/attendance/daily?from=" + monday + "&to=" + monday + "&employeeId=" + an, hr));
        assertThat(JsonPath.<String>read(daily, "$.rows[0].days[0].manual")).isEqualTo("FULL");
        assertThat(JsonPath.<Integer>read(daily, "$.rows[0].days[0].workedMinutes")).isEqualTo(480);
        assertThat(JsonPath.<Integer>read(daily, "$.rows[0].days[0].lateMinutes")).isZero();
        assertThat(JsonPath.<Integer>read(daily, "$.rows[0].days[0].earlyLeaveMinutes")).isZero();
        assertThat(JsonPath.<List<String>>read(daily, "$.rows[0].days[0].flags")).isEmpty();
        assertThat(JsonPath.<Integer>read(daily, "$.rows[0].totals.workedDays")).isEqualTo(1);
        assertThat(JsonPath.<Integer>read(daily, "$.rows[0].totals.workedMinutes")).isEqualTo(480);

        String detail = body(get("/api/attendance/daily/" + an + "/" + monday, hr));
        assertThat(JsonPath.<List<String>>read(detail, "$.punches[*].role")).containsExactly("NOT_USED", "NOT_USED");
        assertThat(JsonPath.<String>read(detail, "$.manualEntry.kind")).isEqualTo("FULL");
        assertThat(JsonPath.<String>read(detail, "$.manualEntry.note")).isEqualTo("Đi công tác");
        assertThat(JsonPath.<String>read(detail, "$.manualEntry.enteredBy")).isNotBlank();
    }

    @Test
    void aPeriodForAUnitSkipsDaysWithoutAShiftAndSavingAgainChangesNothing() {
        String week = """
                {"orgUnitId": "%s", "from": "%s", "to": "%s", "kind": "HALF"}""".formatted(am, monday,
                monday.plusDays(6));
        String first = body(save(hr, week));

        // An, Bình and the head; Monday to Friday have the default shift, Saturday and Sunday none.
        assertThat(JsonPath.<Integer>read(first, "$.employees")).isEqualTo(3);
        assertThat(JsonPath.<Integer>read(first, "$.created")).isEqualTo(15);
        assertThat(JsonPath.<List<String>>read(first, "$.skipped[*].date"))
                .containsExactly(monday.plusDays(5).toString(), monday.plusDays(6).toString());
        assertThat(JsonPath.<List<Integer>>read(first, "$.skipped[*].employees")).containsOnly(3);
        assertThat(audits()).isEqualTo(1);

        String again = body(save(hr, week));
        assertThat(JsonPath.<Integer>read(again, "$.unchanged")).isEqualTo(15);
        assertThat(JsonPath.<Integer>read(again, "$.created")).isZero();
        assertThat(audits()).isEqualTo(1);

        String list = body(get("/api/attendance/manual?orgUnitId=" + am + "&from=" + monday + "&to="
                + monday.plusDays(6), hr));
        assertThat(JsonPath.<List<String>>read(list, "$.rows[*].employee.fullName"))
                .containsExactly("Nguyễn Văn An", "Trần Thị Bình", "Vũ Trưởng");
        assertThat(JsonPath.<List<?>>read(list, "$.rows[0].shiftDays")).hasSize(5);
        assertThat(JsonPath.<List<String>>read(list, "$.rows[0].entries[*].kind")).hasSize(5).containsOnly("HALF");

        // Friday An also punched a full day: Nửa công wins, 4 hours, never 12.
        String friday = body(get("/api/attendance/daily?from=" + monday.plusDays(4) + "&to=" + monday.plusDays(4)
                + "&employeeId=" + an, hr));
        assertThat(JsonPath.<Integer>read(friday, "$.rows[0].days[0].workedMinutes")).isEqualTo(240);
    }

    @Test
    void timesAreJudgedLikeAPairOfPunches() {
        assertThat(save(hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s", "kind": "TIMES", "in": "08:20", "out": "17:00"}"""
                .formatted(binh, monday.plusDays(1), monday.plusDays(1)))).hasStatusOk();

        String daily = body(get("/api/attendance/daily?from=" + monday.plusDays(1) + "&to=" + monday.plusDays(1)
                + "&employeeId=" + binh, hr));
        assertThat(JsonPath.<Integer>read(daily, "$.rows[0].days[0].lateMinutes")).isEqualTo(20);
        assertThat(JsonPath.<Integer>read(daily, "$.rows[0].days[0].workedMinutes")).isEqualTo(460);
        assertThat(JsonPath.<String>read(daily, "$.rows[0].days[0].inSource")).isEqualTo("MANUAL");
        assertThat(JsonPath.<String>read(daily, "$.rows[0].days[0].in")).startsWith(monday.plusDays(1) + "T08:20");

        // An Out before the In is the next morning, which only a night shift allows.
        MvcTestResult overnight = save(hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s", "kind": "TIMES", "in": "22:00", "out": "06:00"}"""
                .formatted(binh, monday.plusDays(2), monday.plusDays(2)));
        assertThat(overnight).hasStatus(400);
        assertThat(JsonPath.<List<String>>read(body(overnight), "$.errors[?(@.field == 'out')].code"))
                .containsExactly("before_in");

        assertThat(send("put", "/api/shift-assignments", hr, """
                {"shiftId": "%s", "employeeIds": ["%s"], "from": "%s", "to": "%s"}""".formatted(night, binh,
                monday.plusDays(2), monday.plusDays(2)))).hasStatusOk();
        assertThat(save(hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s", "kind": "TIMES", "in": "22:00", "out": "06:00"}"""
                .formatted(binh, monday.plusDays(2), monday.plusDays(2)))).hasStatusOk();
        String nightDay = body(get("/api/attendance/daily?from=" + monday.plusDays(2) + "&to=" + monday.plusDays(2)
                + "&employeeId=" + binh, hr));
        assertThat(JsonPath.<String>read(nightDay, "$.rows[0].days[0].out")).startsWith(monday.plusDays(3) + "T06:00");
        assertThat(JsonPath.<Integer>read(nightDay, "$.rows[0].days[0].workedMinutes")).isEqualTo(480);
    }

    @Test
    void clearingGivesTheDayBackToThePunches() {
        save(hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s", "kind": "ABSENT"}""".formatted(an, monday, monday));

        MvcTestResult cleared = send("delete", "/api/attendance/manual", hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s"}""".formatted(an, monday, monday));
        assertThat(cleared).hasStatusOk();
        assertThat(JsonPath.<Integer>read(body(cleared), "$.removed")).isEqualTo(1);
        assertThat(audits()).isEqualTo(2);

        String daily = body(get("/api/attendance/daily?from=" + monday + "&to=" + monday + "&employeeId=" + an, hr));
        assertThat(JsonPath.<Object>read(daily, "$.rows[0].days[0].manual")).isNull();
        assertThat(JsonPath.<Integer>read(daily, "$.rows[0].days[0].lateMinutes")).isEqualTo(31);
    }

    @Test
    void aManualDayIsJudgedEvenWhenTheLogDoesNotCoverIt() {
        // Punches stop two weeks back; the Monday after is not covered by the log.
        LocalDate next = monday.plusDays(7);
        save(hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s", "kind": "ABSENT"}""".formatted(binh, next, next));

        String daily = body(get("/api/attendance/daily?from=" + next + "&to=" + next + "&employeeId=" + binh, hr));
        assertThat(JsonPath.<Boolean>read(daily, "$.rows[0].days[0].noLog")).isFalse();
        assertThat(JsonPath.<List<String>>read(daily, "$.rows[0].days[0].flags")).containsExactly("ABSENT");
    }

    @Test
    void onlyAttendanceManualMayReadOrWriteAndOnlyInsideTheDataScope() {
        String one = """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s", "kind": "FULL"}""".formatted(an, monday, monday);
        assertThat(save(lineManager, one)).hasStatus(403);
        assertThat(save(anBearer, one)).hasStatus(403);
        assertThat(get("/api/attendance/manual?orgUnitId=" + am + "&from=" + monday + "&to=" + monday, lineManager))
                .hasStatus(403);
        assertThat(mvc.put().uri("/api/attendance/manual").contentType(MediaType.APPLICATION_JSON).content(one)
                .exchange()).hasStatus(401);

        // The Line manager is given the permission: Dũng (unit AN) is outside the unit they head.
        jdbc.update("""
                insert into role_permission_override (id, legal_entity_id, role, permission, granted)
                values (?, (select id from legal_entity), 'LINE_MANAGER', 'ATTENDANCE_MANUAL', true)""",
                UUID.randomUUID());
        try {
            assertThat(save(lineManager, one)).hasStatusOk();
            MvcTestResult outside = save(lineManager, """
                    {"employeeIds": ["%s"], "from": "%s", "to": "%s", "kind": "FULL"}""".formatted(dung, monday,
                    monday));
            assertThat(outside).hasStatus(403);
            assertThat(JsonPath.<String>read(body(outside), "$.code")).isEqualTo("manual_attendance.out_of_scope");
        } finally {
            jdbc.update("delete from role_permission_override where permission = 'ATTENDANCE_MANUAL'");
        }
    }

    @Test
    void valuesAreValidated() {
        assertThat(codes(save(hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s", "kind": "TIMES", "in": "08:00"}"""
                .formatted(an, monday, monday)), "out")).containsExactly("required");
        assertThat(codes(save(hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s", "kind": "FULL", "in": "08:00"}"""
                .formatted(an, monday, monday)), "in")).containsExactly("times_for_times_only");
        assertThat(codes(save(hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s", "kind": "LATE"}"""
                .formatted(an, monday, monday)), "kind")).containsExactly("invalid");
        LocalDate tomorrow = LocalDate.now(ZONE).plusDays(1);
        assertThat(codes(save(hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s", "kind": "FULL"}"""
                .formatted(an, tomorrow, tomorrow)), "to")).containsExactly("future");
        assertThat(codes(save(hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s", "days": ["%s"], "kind": "FULL"}"""
                .formatted(an, monday, monday, monday.plusDays(1))), "days")).containsExactly("outside_range");
        assertThat(codes(save(hr, """
                {"from": "%s", "to": "%s", "kind": "FULL"}""".formatted(monday, monday)), "employeeIds"))
                .containsExactly("required");
    }

    private List<String> codes(MvcTestResult result, String field) {
        assertThat(result).hasStatus(400);
        return JsonPath.read(body(result), "$.errors[?(@.field == '" + field + "')].code");
    }

    /** Audit log records of this test (the log is append-only, so earlier tests' records stay). */
    private int audits() {
        return jdbc.queryForObject("select count(*) from audit_log where entity_type = 'MANUAL_ATTENDANCE'",
                Integer.class) - auditsBefore;
    }

    MvcTestResult save(String bearer, String json) {
        return send("put", "/api/attendance/manual", bearer, json);
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
        var builder = switch (method) {
            case "post" -> mvc.post();
            case "put" -> mvc.put();
            default -> mvc.delete();
        };
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
