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
 * Đơn bổ sung công (HRM-24) against real PostgreSQL, through the approval engine. Unit AJ (default shift 08:00-17:00,
 * lunch 12:00-13:00, 5 minutes of tolerance) holds An, Trí and its head Hùng, An's Quản lý trực tiếp. The week used is
 * last week, Monday to Friday. An punched In at 07:58 on Monday and forgot his Out; Tuesday he has no punch at all;
 * Wednesday he punched both; Friday he punched both too, which makes the log cover the whole week.
 */
@IntegrationTest
class AttendanceAdjustmentApiIT {

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
    UUID aj;
    UUID an;
    UUID tri;
    UUID hung;
    String anBearer;
    String triBearer;
    String hungBearer;
    String hr;
    LocalDate monday;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        jdbc.update("delete from approval_flow_setting");
        jdbc.update("delete from work_schedule");
        aj = unit("AJ");
        hung = testEmployees.create("Lê Văn Hùng", aj);
        an = testEmployees.create("Nguyễn Văn An", aj);
        tri = testEmployees.create("Cao Minh Trí", aj);
        testEmployees.makeHead(aj, hung);
        anBearer = signedIn(an, Role.EMPLOYEE);
        triBearer = signedIn(tri, Role.EMPLOYEE);
        hungBearer = signedIn(hung, Role.LINE_MANAGER);
        hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));

        monday = LocalDate.now(ZONE).minusDays(7);
        while (monday.getDayOfWeek() != DayOfWeek.MONDAY) {
            monday = monday.minusDays(1);
        }
        String day = shift("ZAA-DAY", "08:00", "17:00", "\"breakStart\": \"12:00\", \"breakEnd\": \"13:00\", "
                + "\"lateToleranceMinutes\": 5, \"earlyToleranceMinutes\": 5, \"roundingMode\": \"NONE\"");
        assertThat(send("put", "/api/org-units/" + aj + "/default-shift", hr, "{\"shiftId\": \"" + day + "\"}"))
                .hasStatusOk();
        punch(an, monday, 7, 58);
        punch(an, monday.plusDays(2), 8, 0);
        punch(an, monday.plusDays(2), 17, 0);
        punch(an, monday.plusDays(4), 8, 0);
        punch(an, monday.plusDays(4), 17, 0);
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("update org_unit set default_shift_id = null");
        jdbc.update("delete from org_unit");
        jdbc.update("delete from shift where code like 'ZAA%'");
    }

    @Test
    void anApprovedRequestFillsTheMissingOutOfThatDay() {
        String check = body(get("/api/attendance/adjustments/check?date=" + monday, anBearer));
        assertThat(JsonPath.<Boolean>read(check, "$.inMissing")).isFalse();
        assertThat(JsonPath.<Boolean>read(check, "$.outMissing")).isTrue();
        assertThat(JsonPath.<List<String>>read(check, "$.problems")).isEmpty();
        assertThat(JsonPath.<List<String>>read(check, "$.approvers.firstLevel[*].fullName"))
                .containsExactly("Lê Văn Hùng");
        assertThat(JsonPath.<List<String>>read(check, "$.day.flags")).containsExactly("MISSING_OUT");

        MvcTestResult sent = send("post", "/api/attendance/adjustments", anBearer, """
                {"date": "%s", "out": "17:05", "reason": "Quên quẹt khi về"}""".formatted(monday));
        assertThat(sent).hasStatus(201);
        String id = JsonPath.read(body(sent), "$.id");
        assertThat(JsonPath.<String>read(body(sent), "$.status")).isEqualTo("PENDING");
        assertThat(JsonPath.<String>read(body(sent), "$.out")).startsWith(monday + "T17:05");
        assertThat(JsonPath.<List<String>>read(body(sent), "$.dayAfter.flags")).isEmpty();
        assertThat(JsonPath.<Integer>read(body(sent), "$.dayAfter.workedMinutes")).isEqualTo(480);
        assertThat(JsonPath.<Boolean>read(body(sent), "$.canCancel")).isTrue();

        // Waiting: the day is still missing its Out.
        assertThat(this.<List<String>>dayValue(monday, "flags")).containsExactly("MISSING_OUT");

        // The approver opens it and sees the day now and after.
        String seen = body(get("/api/attendance/adjustments/" + id, hungBearer));
        assertThat(JsonPath.<String>read(seen, "$.employee.fullName")).isEqualTo("Nguyễn Văn An");
        assertThat(JsonPath.<List<String>>read(seen, "$.dayNow.flags")).containsExactly("MISSING_OUT");
        assertThat(JsonPath.<Boolean>read(seen, "$.canCancel")).isFalse();

        assertThat(decide(hungBearer, id, "approve", null)).hasStatusOk();

        assertThat(JsonPath.<String>read(body(get("/api/attendance/adjustments/" + id, anBearer)), "$.status"))
                .isEqualTo("APPROVED");
        assertThat(this.<List<String>>dayValue(monday, "flags")).isEmpty();
        assertThat(this.<String>dayValue(monday, "outSource")).isEqualTo("ADJUSTMENT");
        assertThat(this.<String>dayValue(monday, "inSource")).isEqualTo("PUNCH");
        assertThat(this.<Integer>dayValue(monday, "workedMinutes")).isEqualTo(480);
        String list = body(get("/api/attendance/adjustments", anBearer));
        assertThat(JsonPath.<List<String>>read(list, "$.items[*].status")).containsExactly("APPROVED");
    }

    @Test
    void bothTimesOfAnAbsentDayClearAbsentAndLatenessFollowsTheNewIn() {
        LocalDate tuesday = monday.plusDays(1);
        String id = sent("""
                {"date": "%s", "in": "08:20", "out": "17:00", "reason": "Máy chấm công hỏng"}""".formatted(tuesday));

        assertThat(this.<List<String>>dayValue(tuesday, "flags")).containsExactly("ABSENT");
        assertThat(decide(hungBearer, id, "approve", null)).hasStatusOk();

        assertThat(this.<List<String>>dayValue(tuesday, "flags")).isEmpty();
        assertThat(this.<Integer>dayValue(tuesday, "lateMinutes")).isEqualTo(20);
    }

    @Test
    void aRejectedOrCancelledRequestChangesNothingAndFreesTheDay() {
        String rejected = sent("""
                {"date": "%s", "out": "17:05", "reason": "Quên quẹt"}""".formatted(monday));
        assertThat(decide(hungBearer, rejected, "reject", "Không có trong camera")).hasStatusOk();
        assertThat(this.<List<String>>dayValue(monday, "flags")).containsExactly("MISSING_OUT");

        String cancelled = sent("""
                {"date": "%s", "out": "17:05", "reason": "Quên quẹt lần nữa"}""".formatted(monday));
        MvcTestResult cancel = send("post", "/api/attendance/adjustments/" + cancelled + "/cancel", anBearer, "{}");
        assertThat(cancel).hasStatusOk();
        assertThat(JsonPath.<String>read(body(cancel), "$.status")).isEqualTo("CANCELLED");
        assertThat(this.<List<String>>dayValue(monday, "flags")).containsExactly("MISSING_OUT");
        assertThat(send("post", "/api/attendance/adjustments/" + cancelled + "/cancel", anBearer, "{}"))
                .hasStatus(409);
    }

    @Test
    void aReturnedRequestIsEditedAndSentAgain() {
        String id = sent("""
                {"date": "%s", "out": "18:30", "reason": "Quên quẹt"}""".formatted(monday));
        assertThat(decide(hungBearer, id, "return", "Ghi rõ giờ về")).hasStatusOk();

        MvcTestResult edited = send("put", "/api/attendance/adjustments/" + id, anBearer, """
                {"out": "17:10", "reason": "Về lúc 17:10, quên quẹt"}""");
        assertThat(edited).hasStatusOk();
        assertThat(JsonPath.<String>read(body(edited), "$.status")).isEqualTo("PENDING");
        assertThat(JsonPath.<String>read(body(edited), "$.out")).startsWith(monday + "T17:10");
        assertThat(send("put", "/api/attendance/adjustments/" + id, anBearer, """
                {"out": "17:10", "reason": "x"}""")).hasStatus(409);
    }

    @Test
    void itOnlyFillsWhatIsMissing() {
        // Monday's In was punched: it cannot be changed.
        assertThat(codes(send("post", "/api/attendance/adjustments", anBearer, """
                {"date": "%s", "in": "07:30", "out": "17:00", "reason": "x"}""".formatted(monday)), "in"))
                .containsExactly("not_missing");
        // Wednesday has both: nothing to fill.
        assertThat(codes(send("post", "/api/attendance/adjustments", anBearer, """
                {"date": "%s", "out": "18:00", "reason": "x"}""".formatted(monday.plusDays(2))), "date"))
                .containsExactly("nothing_missing");
        // The Out cannot come before the punched In.
        assertThat(codes(send("post", "/api/attendance/adjustments", anBearer, """
                {"date": "%s", "out": "07:00", "reason": "x"}""".formatted(monday)), "out"))
                .containsExactly("out_before_in");
    }

    @Test
    void theDaysThatTakeNoRequestAreRefused() {
        sent("""
                {"date": "%s", "out": "17:05", "reason": "Quên quẹt"}""".formatted(monday));
        assertThat(codes(send("post", "/api/attendance/adjustments", anBearer, """
                {"date": "%s", "out": "17:06", "reason": "Lần hai"}""".formatted(monday)), "date"))
                .containsExactly("already_open");
        assertThat(codes(send("post", "/api/attendance/adjustments", anBearer, """
                {"date": "%s", "in": "08:00", "reason": "x"}""".formatted(monday.plusDays(5))), "date"))
                .containsExactly("no_shift");
        LocalDate tomorrow = LocalDate.now(ZONE).plusDays(1);
        assertThat(codes(send("post", "/api/attendance/adjustments", anBearer, """
                {"date": "%s", "in": "08:00", "reason": "x"}""".formatted(tomorrow)), "date"))
                .containsExactly("future");
        assertThat(codes(send("post", "/api/attendance/adjustments", anBearer, """
                {"date": "%s", "in": "08:00", "reason": "x"}""".formatted(monday.minusDays(35))), "date"))
                .containsExactly("too_old");
        assertThat(codes(send("post", "/api/attendance/adjustments", anBearer, """
                {"date": "%s", "reason": "x"}""".formatted(monday.plusDays(1))), "in"))
                .containsExactly("required");
        assertThat(codes(send("post", "/api/attendance/adjustments", anBearer, """
                {"date": "%s", "in": "08:00"}""".formatted(monday.plusDays(1))), "reason"))
                .containsExactly("required");

        // A day with Công thủ công is the timekeeper's to correct.
        assertThat(send("put", "/api/attendance/manual", hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s", "kind": "ABSENT"}"""
                .formatted(an, monday.plusDays(1), monday.plusDays(1)))).hasStatusOk();
        assertThat(codes(send("post", "/api/attendance/adjustments", anBearer, """
                {"date": "%s", "in": "08:00", "out": "17:00", "reason": "x"}""".formatted(monday.plusDays(1))),
                "date")).containsExactly("manual_entry");
    }

    @Test
    void onlyTheSenderAndTheApproversSeeARequest() {
        String id = sent("""
                {"date": "%s", "out": "17:05", "reason": "Quên quẹt"}""".formatted(monday));

        assertThat(get("/api/attendance/adjustments/" + id, triBearer)).hasStatus(404);
        assertThat(send("post", "/api/attendance/adjustments/" + id + "/cancel", hungBearer, "{}")).hasStatus(403);
        assertThat(JsonPath.<List<?>>read(body(get("/api/attendance/adjustments", triBearer)), "$.items")).isEmpty();
        assertThat(mvc.get().uri("/api/attendance/adjustments/" + id).exchange()).hasStatus(401);
    }

    // ------------------------------------------------------------------------------------------------- helpers

    private String sent(String json) {
        MvcTestResult sent = send("post", "/api/attendance/adjustments", anBearer, json);
        assertThat(sent).hasStatus(201);
        return JsonPath.read(body(sent), "$.id");
    }

    /** One value of An's day in the Công theo ngày, read by HR. */
    private <T> T dayValue(LocalDate day, String field) {
        String body = body(get("/api/attendance/daily?from=" + day + "&to=" + day + "&employeeId=" + an, hr));
        return JsonPath.read(body, "$.rows[0].days[0]." + field);
    }

    private List<String> codes(MvcTestResult result, String field) {
        assertThat(result).hasStatus(400);
        return JsonPath.read(body(result), "$.errors[?(@.field == '" + field + "')].code");
    }

    MvcTestResult decide(String bearer, String id, String action, String comment) {
        String json = comment == null ? "{}" : "{\"comment\":\"" + comment + "\"}";
        return mvc.post().uri("/api/approvals/{id}/{action}", id, action).header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    String signedIn(UUID employee, Role role) {
        TestAccounts.TestAccount account = testAccounts.create(role);
        testEmployees.link(account.id(), employee);
        return testAccounts.bearer(mvc, account);
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
