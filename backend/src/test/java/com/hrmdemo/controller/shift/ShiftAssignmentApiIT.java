package com.hrmdemo.controller.shift;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;

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
 * Phân ca against real PostgreSQL. Unit ZP has the child unit ZC; ZO is a separate unit. ZP holds two Employees and a
 * resigned one, ZC one, ZO one. The Line manager heads ZP. The Wednesday of the week used is a holiday.
 */
@IntegrationTest
class ShiftAssignmentApiIT {

    static final String HOLIDAY = "Ngày kiểm thử phân ca";

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    UUID zp;
    UUID zc;
    UUID zo;
    UUID an;
    UUID binh;
    UUID chi;
    UUID dung;
    UUID resigned;
    String hr;
    String lineManager;
    String director;
    String employee;
    String day;
    String night;
    LocalDate monday;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        zp = unit("ZP", null);
        zc = unit("ZC", zp);
        zo = unit("ZO", null);
        an = testEmployees.create("Nguyễn Văn An", zp);
        binh = testEmployees.create("Trần Thị Bình", zp);
        chi = testEmployees.create("Lê Chi", zc);
        dung = testEmployees.create("Phạm Dũng", zo);
        resigned = testEmployees.create("Đã Nghỉ", zp, "INACTIVE");
        UUID head = testEmployees.create("Vũ Trưởng", zp);
        testEmployees.makeHead(zp, head);
        hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));
        director = testAccounts.bearer(mvc, testAccounts.create(Role.DIRECTOR));
        employee = testAccounts.bearer(mvc, testAccounts.create(Role.EMPLOYEE));
        TestAccounts.TestAccount manager = testAccounts.create(Role.LINE_MANAGER);
        testEmployees.link(manager.id(), head);
        lineManager = testAccounts.bearer(mvc, manager);

        jdbc.update("delete from work_schedule");
        monday = LocalDate.now().plusDays(21);
        while (monday.getDayOfWeek() != DayOfWeek.MONDAY) {
            monday = monday.plusDays(1);
        }
        jdbc.update("""
                insert into catalog_item (id, legal_entity_id, catalog, name, search_text, active, start_date,
                    end_date, created_at, updated_at)
                values (?, (select id from legal_entity), 'HOLIDAY', ?, 'ngay kiem thu phan ca', true, ?, ?, now(),
                    now())""", UUID.randomUUID(), HOLIDAY, monday.plusDays(2), monday.plusDays(2));
        day = shift("ZIT-DAY", "08:00", "17:00");
        night = shift("ZIT-NIGHT", "22:00", "06:00");
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("update org_unit set default_shift_id = null");
        jdbc.update("delete from org_unit");
        jdbc.update("delete from shift where code like 'ZIT%'");
        jdbc.update("delete from catalog_item where name = ?", HOLIDAY);
    }

    @Test
    void aUnitAndTheUnitsBelowGetOneRowPerPersonPerWorkingDayAndAssigningAgainReplacesNeverDuplicates() {
        MvcTestResult first = assign(hr, unitRequest(day, zp, monday, monday.plusDays(6)));

        assertThat(first).hasStatusOk();
        String body = body(first);
        // An, Bình, the head and Chi (in the unit below); the resigned Employee is left out. Mon, Tue, Thu, Fri: the Wednesday
        // is a holiday and the weekend is off.
        assertThat(JsonPath.<Integer>read(body, "$.employees")).isEqualTo(4);
        assertThat(JsonPath.<List<String>>read(body, "$.days")).containsExactly(monday.toString(),
                monday.plusDays(1).toString(), monday.plusDays(3).toString(), monday.plusDays(4).toString());
        assertThat(JsonPath.<Integer>read(body, "$.created")).isEqualTo(16);
        assertThat(JsonPath.<List<String>>read(body, "$.skipped[*].reason")).containsExactly("HOLIDAY", "DAY_OFF",
                "DAY_OFF");
        assertThat(JsonPath.<String>read(body, "$.skipped[0].name")).isEqualTo(HOLIDAY);
        assertThat(rows()).isEqualTo(16);
        assertThat(rowsOf(resigned)).isZero();
        assertThat(rowsOf(dung)).isZero();

        MvcTestResult again = assign(hr, unitRequest(day, zp, monday, monday.plusDays(6)));
        assertThat(JsonPath.<Integer>read(body(again), "$.created")).isZero();
        assertThat(JsonPath.<Integer>read(body(again), "$.unchanged")).isEqualTo(16);
        assertThat(rows()).isEqualTo(16);

        MvcTestResult replaced = assign(hr, unitRequest(night, zp, monday, monday.plusDays(1)));
        assertThat(JsonPath.<Integer>read(body(replaced), "$.replaced")).isEqualTo(8);
        assertThat(rows()).isEqualTo(16);
        assertThat(jdbc.queryForObject("select count(*) from shift_assignment where shift_id = ?::uuid", Integer.class,
                night)).isEqualTo(8);
    }

    @Test
    void chosenWeekdaysAndExplicitDaysSelectTheDays() {
        MvcTestResult mondayAndTuesday = assign(hr, """
                {"shiftId": "%s", "employeeIds": ["%s"], "from": "%s", "to": "%s",
                 "weekdays": ["MONDAY", "TUESDAY"]}""".formatted(day, an, monday, monday.plusDays(6)));
        assertThat(JsonPath.<List<String>>read(body(mondayAndTuesday), "$.days"))
                .containsExactly(monday.toString(), monday.plusDays(1).toString());

        LocalDate saturday = monday.plusDays(5);
        MvcTestResult explicit = assign(hr, """
                {"shiftId": "%s", "employeeIds": ["%s"], "from": "%s", "to": "%s",
                 "weekdays": ["SATURDAY"], "includeDays": ["%s"]}""".formatted(day, an, monday, monday.plusDays(6),
                saturday));
        assertThat(JsonPath.<List<String>>read(body(explicit), "$.days")).containsExactly(saturday.toString());
        assertThat(rowsOf(an)).isEqualTo(3);
    }

    @Test
    void aNightShiftIsStoredOnTheDayItStarts() {
        assertThat(assign(hr, """
                {"shiftId": "%s", "employeeIds": ["%s"], "from": "%s", "to": "%s"}""".formatted(night, an, monday,
                monday))).hasStatusOk();

        assertThat(jdbc.queryForList("select work_date::text from shift_assignment where employee_id = ?",
                String.class, an)).containsExactly(monday.toString());
    }

    @Test
    void theLineManagerAssignsWithinTheirUnitAndIsRefusedOutsideIt() {
        assertThat(assign(lineManager, unitRequest(day, zp, monday, monday))).hasStatusOk();
        assertThat(assign(lineManager, """
                {"shiftId": "%s", "employeeIds": ["%s", "%s"], "from": "%s", "to": "%s"}""".formatted(day, an, dung,
                monday, monday))).hasStatus(403);
        MvcTestResult outside = assign(lineManager, unitRequest(day, zo, monday, monday));
        assertThat(outside).hasStatus(403);
        assertThat(JsonPath.<String>read(body(outside), "$.code")).isEqualTo("shift_assignment.out_of_scope");
        // Refused, not skipped: nothing was written for the person outside, nor for the one inside.
        assertThat(rowsOf(dung)).isZero();
        assertThat(rowsOf(an)).isEqualTo(1);
    }

    @Test
    void onlyThoseWithShiftAssignMayChange() {
        assertThat(assign(director, unitRequest(day, zp, monday, monday))).hasStatus(403);
        assertThat(assign(employee, unitRequest(day, zp, monday, monday))).hasStatus(403);
        assertThat(send("delete", "/api/shift-assignments", director, """
                {"orgUnitId": "%s", "from": "%s", "to": "%s"}""".formatted(zp, monday, monday))).hasStatus(403);
        assertThat(send("put", "/api/org-units/" + zp + "/default-shift", employee, "{\"shiftId\": \"" + day + "\"}"))
                .hasStatus(403);
        assertThat(rows()).isZero();
    }

    @Test
    void eachCauseOfRefusalHasItsOwnCode() {
        jdbc.update("update shift set active = false where id = ?::uuid", night);
        MvcTestResult inactive = assign(hr, unitRequest(night, zp, monday, monday));
        assertThat(inactive).hasStatus(409);
        assertThat(JsonPath.<String>read(body(inactive), "$.code")).isEqualTo("shift.inactive");

        MvcTestResult unknown = assign(hr, unitRequest(UUID.randomUUID().toString(), zp, monday, monday));
        assertThat(unknown).hasStatus(404);
        assertThat(JsonPath.<String>read(body(unknown), "$.code")).isEqualTo("shift.not_found");

        assertThat(errorCodes(assign(hr, unitRequest(day, zp, monday, monday.plusDays(62)))))
                .contains("to:range_too_long");
        assertThat(errorCodes(assign(hr, unitRequest(day, zp, monday, monday.minusDays(1)))))
                .contains("to:before_from");
        assertThat(errorCodes(assign(hr, """
                {"shiftId": "%s", "from": "%s", "to": "%s"}""".formatted(day, monday, monday))))
                .contains("employeeIds:required");
        assertThat(errorCodes(assign(hr, """
                {"shiftId": "%s", "employeeIds": ["%s"], "orgUnitId": "%s", "from": "%s", "to": "%s"}"""
                .formatted(day, an, zp, monday, monday)))).contains("orgUnitId:exclusive");
        assertThat(errorCodes(assign(hr, """
                {"shiftId": "%s", "employeeIds": ["%s"], "from": "%s", "to": "%s"}""".formatted(day, resigned,
                monday, monday)))).contains("employeeIds:inactive");
        assertThat(errorCodes(assign(hr, """
                {"shiftId": "%s", "employeeIds": ["%s"], "from": "%s", "to": "%s"}""".formatted(day,
                UUID.randomUUID(), monday, monday)))).contains("employeeIds:not_found");
        assertThat(errorCodes(assign(hr, """
                {"shiftId": "%s", "employeeIds": ["%s"], "from": "%s", "to": "%s", "includeDays": ["%s"]}"""
                .formatted(day, an, monday, monday, monday.plusDays(3))))).contains("includeDays:outside_range");

        String tooMany = IntStream.range(0, 501).mapToObj(i -> "\"" + UUID.randomUUID() + "\"")
                .reduce((a, b) -> a + "," + b).orElseThrow();
        assertThat(errorCodes(assign(hr, """
                {"shiftId": "%s", "employeeIds": [%s], "from": "%s", "to": "%s"}""".formatted(day, tooMany, monday,
                monday)))).contains("employeeIds:too_many_people");
        assertThat(errorCodes(assign(hr, unitRequest(day, UUID.randomUUID().toString(), monday, monday)))).isEmpty();
        assertThat(rows()).isZero();
    }

    @Test
    void clearingRemovesTheAssignmentsOfPeopleOrAUnitInTheRange() {
        assign(hr, unitRequest(day, zp, monday, monday.plusDays(4)));
        assertThat(rows()).isEqualTo(16);

        MvcTestResult people = send("delete", "/api/shift-assignments", hr, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s"}""".formatted(an, monday, monday.plusDays(1)));
        assertThat(people).hasStatusOk();
        assertThat(JsonPath.<Integer>read(body(people), "$.removed")).isEqualTo(2);
        assertThat(rowsOf(an)).isEqualTo(2);

        MvcTestResult outside = send("delete", "/api/shift-assignments", lineManager, """
                {"employeeIds": ["%s"], "from": "%s", "to": "%s"}""".formatted(dung, monday, monday));
        assertThat(outside).hasStatus(403);

        MvcTestResult unit = send("delete", "/api/shift-assignments", lineManager, """
                {"orgUnitId": "%s", "from": "%s", "to": "%s"}""".formatted(zp, monday, monday.plusDays(6)));
        assertThat(JsonPath.<Integer>read(body(unit), "$.removed")).isEqualTo(14);
        assertThat(rows()).isZero();
    }

    @Test
    void twoCallsAtOnceLeaveOneShiftPerPersonPerDay() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(6);
        try {
            List<Future<Integer>> calls = new ArrayList<>();
            for (int i = 0; i < 12; i++) {
                String shiftId = i % 2 == 0 ? day : night;
                calls.add(pool.submit(() -> assign(hr, unitRequest(shiftId, zp, monday, monday.plusDays(4)))
                        .getResponse().getStatus()));
            }
            for (Future<Integer> call : calls) {
                assertThat(call.get()).isEqualTo(200);
            }
        } finally {
            pool.shutdownNow();
        }

        assertThat(rows()).isEqualTo(16);
        assertThat(jdbc.queryForObject("""
                select count(*) from (select employee_id, work_date from shift_assignment
                  group by employee_id, work_date having count(*) > 1) d""", Integer.class)).isZero();
    }

    @Test
    void theDefaultShiftOfAUnitIsSetClearedAndGuarded() {
        MvcTestResult set = send("put", "/api/org-units/" + zp + "/default-shift", hr, "{\"shiftId\": \"" + day + "\"}");
        assertThat(set).hasStatusOk();
        assertThat(JsonPath.<String>read(body(set), "$.defaultShiftId")).isEqualTo(day);
        assertThat(jdbc.queryForObject("select default_shift_id::text from org_unit where id = ?", String.class, zp))
                .isEqualTo(day);

        assertThat(send("put", "/api/org-units/" + zp + "/default-shift", lineManager,
                "{\"shiftId\": \"" + night + "\"}")).hasStatusOk();
        assertThat(send("put", "/api/org-units/" + zo + "/default-shift", lineManager,
                "{\"shiftId\": \"" + night + "\"}")).hasStatus(403);
        assertThat(send("put", "/api/org-units/" + UUID.randomUUID() + "/default-shift", hr,
                "{\"shiftId\": \"" + night + "\"}")).hasStatus(404);

        jdbc.update("update shift set active = false where id = ?::uuid", day);
        MvcTestResult inactive = send("put", "/api/org-units/" + zc + "/default-shift", hr,
                "{\"shiftId\": \"" + day + "\"}");
        assertThat(inactive).hasStatus(409);
        assertThat(JsonPath.<String>read(body(inactive), "$.code")).isEqualTo("shift.inactive");

        MvcTestResult cleared = send("put", "/api/org-units/" + zp + "/default-shift", hr, "{\"shiftId\": null}");
        assertThat(cleared).hasStatusOk();
        assertThat(JsonPath.<Object>read(body(cleared), "$.defaultShiftId")).isNull();
        assertThat(jdbc.queryForObject("select default_shift_id from org_unit where id = ?", UUID.class, zp))
                .isNull();
    }

    @Test
    void theDefaultsAreListedForWhoMayViewOrAssignShiftsAndOnlyTheUnitsThatHaveOne() {
        assertThat(send("put", "/api/org-units/" + zp + "/default-shift", hr, "{\"shiftId\": \"" + day + "\"}"))
                .hasStatusOk();
        assertThat(send("put", "/api/org-units/" + zo + "/default-shift", hr, "{\"shiftId\": \"" + night + "\"}"))
                .hasStatusOk();

        for (String bearer : List.of(hr, director, lineManager)) {
            MvcTestResult list = mvc.get().uri("/api/org-units/default-shifts")
                    .header(HttpHeaders.AUTHORIZATION, bearer).exchange();
            assertThat(list).hasStatusOk();
            assertThat(JsonPath.<List<String>>read(body(list), "$[*].orgUnitId")).containsExactly(zp.toString(),
                    zo.toString());
            assertThat(JsonPath.<List<String>>read(body(list), "$[*].defaultShiftId")).containsExactly(day, night);
        }
        // A unit without a shift of its own is not listed, also after its default was cleared.
        assertThat(send("put", "/api/org-units/" + zo + "/default-shift", hr, "{\"shiftId\": null}")).hasStatusOk();
        MvcTestResult after = mvc.get().uri("/api/org-units/default-shifts").header(HttpHeaders.AUTHORIZATION, hr)
                .exchange();
        assertThat(JsonPath.<List<String>>read(body(after), "$[*].orgUnitId")).containsExactly(zp.toString());

        assertThat(mvc.get().uri("/api/org-units/default-shifts").header(HttpHeaders.AUTHORIZATION, employee)
                .exchange()).hasStatus(403);
        assertThat(mvc.get().uri("/api/org-units/default-shifts").exchange()).hasStatus(401);
    }

    @Test
    void everyCallAndEveryChangeOfTheDefaultIsInTheAuditLog() {
        int before = auditRecords();
        assign(hr, unitRequest(day, zp, monday, monday));
        assertThat(auditRecords()).isEqualTo(before + 1);
        // Nothing changed, so nothing is recorded.
        assign(hr, unitRequest(day, zp, monday, monday));
        assertThat(auditRecords()).isEqualTo(before + 1);

        send("delete", "/api/shift-assignments", hr, """
                {"orgUnitId": "%s", "from": "%s", "to": "%s"}""".formatted(zp, monday, monday));
        send("put", "/api/org-units/" + zp + "/default-shift", hr, "{\"shiftId\": \"" + day + "\"}");
        send("put", "/api/org-units/" + zp + "/default-shift", hr, "{\"shiftId\": \"" + day + "\"}");
        assertThat(auditRecords()).isEqualTo(before + 3);

        String detail = body(mvc.get().uri("/api/audit-logs?entityType=SHIFT_ASSIGNMENT&entityId=" + zp)
                .header(HttpHeaders.AUTHORIZATION, testAccounts.adminBearer(mvc)).exchange());
        assertThat(JsonPath.<Integer>read(detail, "$.total")).isEqualTo(1);
    }

    // --- helpers ---

    int auditRecords() {
        return jdbc.queryForObject("select count(*) from audit_log where entity_type = 'SHIFT_ASSIGNMENT'",
                Integer.class);
    }

    int rows() {
        return jdbc.queryForObject("select count(*) from shift_assignment", Integer.class);
    }

    int rowsOf(UUID employeeId) {
        return jdbc.queryForObject("select count(*) from shift_assignment where employee_id = ?", Integer.class,
                employeeId);
    }

    UUID unit(String code, UUID parent) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, ?, 'TEAM', now(), now())""", id, parent, code, code);
        return id;
    }

    String shift(String code, String start, String end) {
        MvcTestResult created = send("post", "/api/shifts", hr, """
                {"code": "%s", "name": "%s", "startTime": "%s", "endTime": "%s", "lateToleranceMinutes": 0,
                 "earlyToleranceMinutes": 0, "roundingMode": "NONE"}""".formatted(code, code, start, end));
        assertThat(created).hasStatus(201);
        return JsonPath.read(body(created), "$.id");
    }

    String unitRequest(String shiftId, UUID orgUnit, LocalDate from, LocalDate to) {
        return unitRequest(shiftId, orgUnit.toString(), from, to);
    }

    String unitRequest(String shiftId, String orgUnit, LocalDate from, LocalDate to) {
        return """
                {"shiftId": "%s", "orgUnitId": "%s", "from": "%s", "to": "%s"}""".formatted(shiftId, orgUnit, from, to);
    }

    MvcTestResult assign(String bearer, String json) {
        return send("put", "/api/shift-assignments", bearer, json);
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

    static List<String> errorCodes(MvcTestResult result) {
        String body = body(result);
        if (!body.contains("\"errors\"")) {
            return List.of();
        }
        List<String> fields = JsonPath.read(body, "$.errors[*].field");
        List<String> codes = JsonPath.read(body, "$.errors[*].code");
        return IntStream.range(0, fields.size()).mapToObj(i -> fields.get(i) + ":" + codes.get(i)).toList();
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
