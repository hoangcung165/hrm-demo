package com.hrmdemo.controller.shift;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
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
 * Lịch ca against real PostgreSQL. Unit ZP (default shift: day) has the child ZC (no default of its own) and ZO has
 * none. An and Bình are in ZP, Chi in ZC, Dũng in ZO. The Wednesday of the week used is a holiday. The Line manager
 * heads ZP.
 */
@IntegrationTest
class ShiftCalendarApiIT {

    static final String HOLIDAY = "Ngày kiểm thử lịch ca";

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
    String hr;
    String lineManager;
    String director;
    String anBearer;
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
        testEmployees.create("Đã Nghỉ", zp, "INACTIVE");
        UUID head = testEmployees.create("Vũ Trưởng", zp);
        testEmployees.makeHead(zp, head);
        hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));
        director = testAccounts.bearer(mvc, testAccounts.create(Role.DIRECTOR));
        TestAccounts.TestAccount manager = testAccounts.create(Role.LINE_MANAGER);
        testEmployees.link(manager.id(), head);
        lineManager = testAccounts.bearer(mvc, manager);
        TestAccounts.TestAccount anAccount = testAccounts.create(Role.EMPLOYEE);
        testEmployees.link(anAccount.id(), an);
        anBearer = testAccounts.bearer(mvc, anAccount);

        jdbc.update("delete from work_schedule");
        monday = LocalDate.now().plusDays(21);
        while (monday.getDayOfWeek() != DayOfWeek.MONDAY) {
            monday = monday.plusDays(1);
        }
        jdbc.update("""
                insert into catalog_item (id, legal_entity_id, catalog, name, search_text, active, start_date,
                    end_date, created_at, updated_at)
                values (?, (select id from legal_entity), 'HOLIDAY', ?, 'ngay kiem thu lich ca', true, ?, ?, now(),
                    now())""", UUID.randomUUID(), HOLIDAY, monday.plusDays(2), monday.plusDays(2));
        day = shift("ZIT-DAY", "08:00", "17:00");
        night = shift("ZIT-NIGHT", "22:00", "06:00");
        assertThat(send("put", "/api/org-units/" + zp + "/default-shift", hr, "{\"shiftId\": \"" + day + "\"}"))
                .hasStatusOk();
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
    void theDefaultFillsWorkingDaysOfTheUnitAndTheUnitsBelowButNeverAWeekendOrAHoliday() {
        MvcTestResult result = calendar(hr, "&orgUnitId=" + zp);

        assertThat(result).hasStatusOk();
        String body = body(result);
        // An, Bình, the head and Chi (ZC inherits the default of ZP); Đã Nghỉ is resigned.
        assertThat(JsonPath.<Integer>read(body, "$.total")).isEqualTo(4);
        assertThat(JsonPath.<List<String>>read(body, "$.rows[*].employee.fullName"))
                .containsExactly("Lê Chi", "Nguyễn Văn An", "Trần Thị Bình", "Vũ Trưởng");
        assertThat(JsonPath.<List<String>>read(body, "$.rows[?(@.employee.fullName == 'Lê Chi')].cells[*].date"))
                .containsExactly(monday.toString(), monday.plusDays(1).toString(), monday.plusDays(3).toString(),
                        monday.plusDays(4).toString());
        assertThat(JsonPath.<List<String>>read(body, "$.rows[0].cells[*].source")).containsOnly("DEFAULT");
        assertThat(JsonPath.<List<String>>read(body, "$.days[*].dayKind")).containsExactly("FULL", "FULL", "FULL",
                "FULL", "FULL", "OFF", "OFF");
        assertThat(JsonPath.<String>read(body, "$.days[2].holiday")).isEqualTo(HOLIDAY);
        assertThat(JsonPath.<Object>read(body, "$.days[0].holiday")).isNull();
        assertThat(JsonPath.<List<String>>read(body, "$.shifts[*].code")).containsExactly("ZIT-DAY");
    }

    @Test
    void anExplicitAssignmentWinsAndAHolidayOrWeekendOneStillShows() {
        assign(hr, an, night, monday, monday);
        // A holiday and a Saturday are assigned only when listed explicitly.
        for (int offset : new int[] {2, 5}) {
            assertThat(send("put", "/api/shift-assignments", hr, """
                    {"shiftId": "%s", "employeeIds": ["%s"], "from": "%s", "to": "%s", "includeDays": ["%s"]}"""
                    .formatted(night, an, monday.plusDays(offset), monday.plusDays(offset),
                            monday.plusDays(offset)))).hasStatusOk();
        }

        String body = body(calendar(hr, "&employeeId=" + an));

        assertThat(JsonPath.<Integer>read(body, "$.total")).isEqualTo(1);
        assertThat(JsonPath.<List<String>>read(body, "$.rows[0].cells[?(@.date == '" + monday + "')].source"))
                .containsExactly("ASSIGNED");
        assertThat(JsonPath.<List<String>>read(body, "$.rows[0].cells[?(@.date == '" + monday + "')].shiftId"))
                .containsExactly(night);
        // The holiday Wednesday and the Saturday show the explicit shift; the Tuesday keeps the default.
        assertThat(JsonPath.<List<String>>read(body, "$.rows[0].cells[*].date")).contains(
                monday.plusDays(2).toString(), monday.plusDays(5).toString());
        assertThat(JsonPath.<List<String>>read(body, "$.rows[0].cells[?(@.date == '" + monday.plusDays(1)
                + "')].source")).containsExactly("DEFAULT");
        assertThat(JsonPath.<List<String>>read(body, "$.shifts[*].code")).containsExactly("ZIT-DAY", "ZIT-NIGHT");
    }

    @Test
    void aNightShiftShowsOnItsStartDayOnly() {
        assign(hr, binh, night, monday.plusDays(3), monday.plusDays(3));
        // The default is off for the unit of Dũng, so only the explicit cell exists.
        String body = body(calendar(hr, "&orgUnitId=" + zo));
        assertThat(JsonPath.<List<String>>read(body, "$.rows[0].cells[*].date")).isEmpty();

        String binhBody = body(calendar(hr, "&employeeId=" + binh + "&shiftId=" + night));
        assertThat(JsonPath.<List<String>>read(binhBody, "$.rows[0].cells[*].date"))
                .containsExactly(monday.plusDays(3).toString());
        assertThat(JsonPath.<Boolean>read(binhBody, "$.shifts[0].crossesMidnight")).isTrue();
    }

    @Test
    void theShiftFilterKeepsThePeopleWhoWorkItAndOnlyItsDays() {
        assign(hr, an, night, monday, monday.plusDays(1));

        String body = body(calendar(hr, "&shiftId=" + night));

        assertThat(JsonPath.<Integer>read(body, "$.total")).isEqualTo(1);
        assertThat(JsonPath.<List<String>>read(body, "$.rows[*].employee.fullName")).containsExactly("Nguyễn Văn An");
        assertThat(JsonPath.<List<String>>read(body, "$.rows[0].cells[*].shiftId")).containsOnly(night);
        assertThat(JsonPath.<List<String>>read(body, "$.rows[0].cells[*].date")).hasSize(2);
    }

    @Test
    void scopeLineManagerSeesTheirUnitAndBelowEmployeeOnlyThemselvesDirectorEveryone() {
        String manager = body(calendar(lineManager, ""));
        assertThat(JsonPath.<List<String>>read(manager, "$.rows[*].employee.fullName"))
                .containsExactly("Lê Chi", "Nguyễn Văn An", "Trần Thị Bình", "Vũ Trưởng");

        // An has no SHIFT_VIEW: only their own row, whatever they ask for.
        String own = body(calendar(anBearer, ""));
        assertThat(JsonPath.<List<String>>read(own, "$.rows[*].employee.fullName")).containsExactly("Nguyễn Văn An");
        assertThat(JsonPath.<List<String>>read(own, "$.rows[0].cells[*].date")).hasSize(4);
        String others = body(calendar(anBearer, "&employeeId=" + binh));
        assertThat(JsonPath.<Integer>read(others, "$.total")).isZero();
        String wide = body(calendar(anBearer, "&orgUnitId=" + zp));
        assertThat(JsonPath.<List<String>>read(wide, "$.rows[*].employee.fullName")).containsExactly("Nguyễn Văn An");

        String everyone = body(calendar(director, ""));
        assertThat(JsonPath.<List<String>>read(everyone, "$.rows[*].employee.fullName"))
                .contains("Phạm Dũng", "Nguyễn Văn An");
        assertThat(JsonPath.<Integer>read(everyone, "$.total")).isEqualTo(5);
        assertThat(JsonPath.<Integer>read(body(calendar(lineManager, "&employeeId=" + dung)), "$.total")).isZero();
    }

    @Test
    void theRowsArePagedByEmployee() {
        String first = body(calendar(hr, "&page=0&size=2"));
        String second = body(calendar(hr, "&page=1&size=2"));
        String third = body(calendar(hr, "&page=2&size=2"));

        assertThat(JsonPath.<Integer>read(first, "$.total")).isEqualTo(5);
        assertThat(JsonPath.<List<String>>read(first, "$.rows[*].employee.fullName")).hasSize(2);
        assertThat(JsonPath.<List<String>>read(second, "$.rows[*].employee.fullName")).hasSize(2);
        assertThat(JsonPath.<List<String>>read(third, "$.rows[*].employee.fullName")).hasSize(1);
        assertThat(JsonPath.<Integer>read(third, "$.page")).isEqualTo(2);
    }

    @Test
    void theQueryIsChecked() {
        assertThat(get("/api/shift-calendar?from=" + monday, hr)).hasStatus(400);
        MvcTestResult tooLong = get("/api/shift-calendar?from=" + monday + "&to=" + monday.plusDays(62), hr);
        assertThat(tooLong).hasStatus(400);
        assertThat(JsonPath.<List<String>>read(body(tooLong), "$.errors[*].code")).contains("range_too_long");
        assertThat(get("/api/shift-calendar?from=" + monday + "&to=" + monday.minusDays(1), hr)).hasStatus(400);
        assertThat(get("/api/shift-calendar?from=" + monday + "&to=" + monday + "&size=501", hr)).hasStatus(400);
        assertThat(get("/api/shift-calendar?from=" + monday + "&to=" + monday + "&orgUnitId=" + UUID.randomUUID(), hr))
                .hasStatus(404);
        assertThat(get("/api/shift-calendar?from=" + monday + "&to=" + monday.plusDays(61), hr)).hasStatusOk();
    }

    // --- helpers ---

    MvcTestResult calendar(String bearer, String extra) {
        return get("/api/shift-calendar?from=" + monday + "&to=" + monday.plusDays(6) + extra, bearer);
    }

    void assign(String bearer, UUID employee, String shiftId, LocalDate from, LocalDate to) {
        assertThat(send("put", "/api/shift-assignments", bearer, """
                {"shiftId": "%s", "employeeIds": ["%s"], "from": "%s", "to": "%s"}""".formatted(shiftId, employee, from,
                to))).hasStatusOk();
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
