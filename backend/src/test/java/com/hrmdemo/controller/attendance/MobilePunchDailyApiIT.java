package com.hrmdemo.controller.attendance;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Công theo ngày with mobile Lần quẹt (HRM-39/BE-4) against real PostgreSQL. Units MP (An, Trí, head Hùng) and MQ
 * (Bình, head Lan) share the default shift 08:00-17:00. The day used is last week's Monday. The company has one place,
 * ZIT Hòa Lạc (200 m); mobile punches are stored as the check-in stores them.
 */
@IntegrationTest
class MobilePunchDailyApiIT {

    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3};

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    UUID an;
    UUID tri;
    UUID binh;
    String anBearer;
    String triBearer;
    String hungBearer;
    String lanBearer;
    String hr;
    String admin;
    UUID place;
    LocalDate monday;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        jdbc.update("delete from work_schedule");
        UUID mp = unit("MP");
        UUID mq = unit("MQ");
        UUID hung = testEmployees.create("Lê Văn Hùng", mp);
        an = testEmployees.create("Nguyễn Văn An", mp);
        tri = testEmployees.create("Cao Minh Trí", mp);
        UUID lan = testEmployees.create("Phạm Thị Lan", mq);
        binh = testEmployees.create("Đỗ Văn Bình", mq);
        testEmployees.makeHead(mp, hung);
        testEmployees.makeHead(mq, lan);
        anBearer = signedIn(an, Role.EMPLOYEE);
        triBearer = signedIn(tri, Role.EMPLOYEE);
        hungBearer = signedIn(hung, Role.LINE_MANAGER);
        lanBearer = signedIn(lan, Role.LINE_MANAGER);
        hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));
        admin = testAccounts.adminBearer(mvc);

        monday = LocalDate.now(ZONE).minusDays(7);
        while (monday.getDayOfWeek() != DayOfWeek.MONDAY) {
            monday = monday.minusDays(1);
        }
        MvcTestResult shift = send("post", "/api/shifts", hr, """
                {"code": "ZMP-DAY", "name": "ZMP", "startTime": "08:00", "endTime": "17:00", "breakStart": "12:00",
                 "breakEnd": "13:00", "lateToleranceMinutes": 5, "earlyToleranceMinutes": 5, "roundingMode": "NONE"}""");
        assertThat(shift).hasStatus(201);
        String shiftId = JsonPath.read(body(shift), "$.id");
        for (UUID unit : List.of(mp, mq)) {
            assertThat(send("put", "/api/org-units/" + unit + "/default-shift", hr,
                    "{\"shiftId\": \"" + shiftId + "\"}")).hasStatusOk();
        }
        MvcTestResult created = send("post", "/api/attendance/locations", hr, """
                {"name": "ZIT Hòa Lạc", "latitude": 21.009, "longitude": 105.529, "radiusMeters": 200}""");
        place = UUID.fromString(JsonPath.read(body(created), "$.id"));
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("update org_unit set default_shift_id = null");
        jdbc.update("delete from org_unit where code in ('MP', 'MQ')");
        jdbc.update("delete from shift where code like 'ZMP%'");
        jdbc.update("delete from attendance_location where lower(name) like 'zit %'");
    }

    @Test
    void aMobileInAndAMachineOutArePairedOnceAndSayWhereTheyWereMade() {
        UUID in = mobile(an, monday, 7, 58, 40, false, false);
        machine(an, monday, 17, 2);
        // The same In from the machine a minute later is a duplicate, never a second pair.
        machine(an, monday, 7, 59);

        Map<String, Object> day = day(an);
        assertThat(flags(day)).containsExactly("DUPLICATE_PUNCH");
        assertThat(day).containsEntry("inPunchSource", "MOBILE").containsEntry("outPunchSource", "MACHINE")
                .containsEntry("workedMinutes", 480).containsEntry("lateMinutes", 0);

        String detail = body(get("/api/attendance/daily/" + an + "/" + monday, hr));
        assertThat(JsonPath.<List<String>>read(detail, "$.punches[*].role")).containsExactly("IN", "DUPLICATE", "OUT");
        assertThat(JsonPath.<String>read(detail, "$.punches[0].id")).isEqualTo(in.toString());
        assertThat(JsonPath.<String>read(detail, "$.punches[0].mobile.location.name")).isEqualTo("ZIT Hòa Lạc");
        assertThat(JsonPath.<Integer>read(detail, "$.punches[0].mobile.distanceMeters")).isEqualTo(40);
        assertThat(JsonPath.<Double>read(detail, "$.punches[0].mobile.latitude")).isEqualTo(21.009);
        assertThat(JsonPath.<Object>read(detail, "$.punches[1].mobile")).isNull();
    }

    @Test
    void anOutsideOrBlurryInOrOutIsAnAbnormalDay() {
        mobile(an, monday, 8, 0, 1_400, true, false);
        mobile(an, monday, 17, 0, 30, false, true);
        mobile(tri, monday, 8, 0, 10, false, false);
        mobile(tri, monday, 17, 0, 10, false, false);

        assertThat(flags(day(an))).containsExactlyInAnyOrder("OUTSIDE_LOCATION", "LOW_ACCURACY");
        assertThat(flags(day(tri))).isEmpty();

        String abnormal = body(get("/api/attendance/daily?from=" + monday + "&to=" + monday + "&orgUnitId="
                + unitOf(an) + "&abnormalOnly=true", hr));
        assertThat(JsonPath.<List<String>>read(abnormal, "$.rows[*].employee.fullName"))
                .containsExactly("Nguyễn Văn An");
    }

    @Test
    void aDayWithAMobilePunchIsJudgedWithoutAnyMachineLog() {
        // No machine punch is stored at all: the machine log covers nothing.
        mobile(an, monday, 8, 20, 10, false, false);

        Map<String, Object> day = day(an);
        assertThat(day).containsEntry("noLog", false).containsEntry("lateMinutes", 20);
        assertThat(flags(day)).containsExactly("MISSING_OUT");
        // A colleague with no punch at all still waits for the log.
        assertThat(day(tri)).containsEntry("noLog", true);
    }

    @Test
    void thePhotoIsSeenByTheEmployeeAndTheirScopeOnlyAndEveryViewIsAudited() {
        UUID punch = mobile(an, monday, 8, 0, 10, false, false);
        String uri = "/api/attendance/punches/" + punch + "/photo";

        MvcTestResult own = get(uri, anBearer);
        assertThat(own).hasStatusOk();
        assertThat(own.getResponse().getContentAsByteArray()).isEqualTo(PNG);
        assertThat(own.getResponse().getContentType()).isEqualTo("image/png");
        assertThat(own.getResponse().getHeader(HttpHeaders.CACHE_CONTROL)).contains("no-store");
        assertThat(get(uri, hungBearer)).as("An's Quản lý trực tiếp").hasStatusOk();
        assertThat(get(uri, hr)).as("HR, company scope").hasStatusOk();

        assertThat(get(uri, triBearer)).as("a colleague").hasStatus(404);
        assertThat(get(uri, lanBearer)).as("the head of another unit").hasStatus(404);
        assertThat(get("/api/attendance/punches/" + UUID.randomUUID() + "/photo", hr)).hasStatus(404);
        UUID machinePunch = machine(an, monday, 17, 0);
        assertThat(get("/api/attendance/punches/" + machinePunch + "/photo", hr)).hasStatus(404);

        assertThat(jdbc.queryForList("""
                select action from audit_log where entity_type = 'PUNCH_PHOTO' and entity_id = ?""", String.class,
                punch)).containsExactly("VIEW", "VIEW", "VIEW");
        String record = jdbc.queryForObject("""
                select id::text from audit_log where entity_type = 'PUNCH_PHOTO' and entity_id = ? limit 1""",
                String.class, punch);
        String shown = body(get("/api/audit-logs/" + record, admin));
        assertThat(JsonPath.<String>read(shown, "$.action")).isEqualTo("VIEW");
        assertThat(JsonPath.<Object>read(shown, "$.before")).isNull();
        assertThat(JsonPath.<String>read(shown, "$.after.employeeId")).isEqualTo(an.toString());
    }

    @Test
    void anotherUnitsHeadDoesNotSeeTheDayEither() {
        mobile(binh, monday, 8, 0, 10, false, false);

        assertThat(get("/api/attendance/daily/" + binh + "/" + monday, hungBearer)).hasStatus(404);
        assertThat(get("/api/attendance/daily/" + binh + "/" + monday, lanBearer)).hasStatusOk();
    }

    // --- helpers ---

    Map<String, Object> day(UUID employee) {
        String body = body(get("/api/attendance/daily?from=" + monday + "&to=" + monday + "&employeeId=" + employee,
                hr));
        return JsonPath.read(body, "$.rows[0].days[0]");
    }

    @SuppressWarnings("unchecked")
    static List<String> flags(Map<String, Object> day) {
        return (List<String>) day.get("flags");
    }

    UUID unitOf(UUID employee) {
        return jdbc.queryForObject("select org_unit_id from employee where id = ?", UUID.class, employee);
    }

    /** A mobile punch as the check-in stores it, with its photo. */
    UUID mobile(UUID employee, LocalDate day, int hour, int minute, int distance, boolean outside, boolean low) {
        UUID id = UUID.randomUUID();
        OffsetDateTime at = day.atTime(hour, minute).atZone(ZONE).toOffsetDateTime();
        jdbc.update("""
                insert into punch (id, legal_entity_id, employee_id, punched_at, source, latitude, longitude,
                    accuracy_meters, location_id, distance_meters, outside_location, low_accuracy, created_at,
                    updated_at)
                values (?, (select id from legal_entity), ?, ?, 'MOBILE', 21.009, 105.529, ?, ?, ?, ?, ?, now(), now())""",
                id, employee, at, low ? 250.0 : 12.0, place, distance, outside, low);
        jdbc.update("""
                insert into punch_photo (punch_id, legal_entity_id, content_type, size_bytes, sha256, content,
                    created_at)
                values (?, (select id from legal_entity), 'image/png', ?, 'x', ?, now())""", id, PNG.length, PNG);
        return id;
    }

    UUID machine(UUID employee, LocalDate day, int hour, int minute) {
        UUID id = UUID.randomUUID();
        OffsetDateTime at = day.atTime(hour, minute).atZone(ZONE).toOffsetDateTime();
        jdbc.update("""
                insert into punch (id, legal_entity_id, employee_id, punched_at, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, now(), now())""", id, employee, at);
        return id;
    }

    String signedIn(UUID employee, Role role) {
        TestAccounts.TestAccount account = testAccounts.create(role);
        testEmployees.link(account.id(), employee);
        return testAccounts.bearer(mvc, account);
    }

    UUID unit(String code) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, ?, ?, 'TEAM', now(), now())""", id, code, code);
        return id;
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
        builder = builder.uri(uri).header(HttpHeaders.AUTHORIZATION, bearer);
        if (json != null) {
            builder = builder.contentType(MediaType.APPLICATION_JSON).content(json);
        }
        return builder.exchange();
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
