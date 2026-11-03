package com.hrmdemo.controller.attendance;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
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
 * Địa điểm chấm công and the rules of mobile check-in (HRM-39/BE-2) against real PostgreSQL: who may read and change,
 * the validation, deactivation and the Audit log.
 */
@IntegrationTest
class AttendanceLocationApiIT {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    String admin;
    String hr;
    String director;
    String lineManager;
    String employee;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        admin = testAccounts.adminBearer(mvc);
        hr = signedIn(Role.HR);
        director = signedIn(Role.DIRECTOR);
        lineManager = signedIn(Role.LINE_MANAGER);
        employee = signedIn(Role.EMPLOYEE);
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("delete from attendance_location where lower(name) like 'zit %'");
        jdbc.update("delete from mobile_checkin_setting");
    }

    @Test
    void hrAddsALocationAndReadsItBack() {
        MvcTestResult created = send("post", "/api/attendance/locations", hr,
                place("  ZIT Hòa Lạc  ", 21.009, 105.529, 200));

        assertThat(created).hasStatus(201);
        String body = body(created);
        assertThat(JsonPath.<String>read(body, "$.name")).isEqualTo("ZIT Hòa Lạc");
        assertThat(JsonPath.<String>read(body, "$.address")).isEqualTo("Khu Công nghệ cao Hòa Lạc");
        assertThat(JsonPath.<Double>read(body, "$.latitude")).isEqualTo(21.009);
        assertThat(JsonPath.<Double>read(body, "$.longitude")).isEqualTo(105.529);
        assertThat(JsonPath.<Integer>read(body, "$.radiusMeters")).isEqualTo(200);
        assertThat(JsonPath.<Boolean>read(body, "$.active")).isTrue();

        MvcTestResult read = get("/api/attendance/locations/" + JsonPath.read(body, "$.id"), admin);
        assertThat(read).hasStatusOk();
        assertThat(JsonPath.<String>read(body(read), "$.name")).isEqualTo("ZIT Hòa Lạc");
    }

    @Test
    void onlyAdminAndHrReadAndChangeTheLocations() {
        for (String other : List.of(director, lineManager, employee)) {
            assertThat(send("post", "/api/attendance/locations", other, place("ZIT A", 21, 105, 100)))
                    .hasStatus(403);
            assertThat(get("/api/attendance/locations", other)).hasStatus(403);
            assertThat(get("/api/attendance/mobile-checkin-settings", other)).hasStatus(403);
            assertThat(send("put", "/api/attendance/mobile-checkin-settings", other, "{\"maxAccuracyMeters\": 50}"))
                    .hasStatus(403);
        }
        String id = createdId(place("ZIT B", 21, 105, 100));
        assertThat(send("put", "/api/attendance/locations/" + id, director, place("ZIT B2", 21, 105, 100)))
                .hasStatus(403);
        assertThat(send("post", "/api/attendance/locations/" + id + "/deactivate", employee, null)).hasStatus(403);
        assertThat(get("/api/attendance/locations", admin)).hasStatusOk();
    }

    @Test
    void invalidValuesAreListedByFieldAndATakenNameIsRefused() {
        createdId(place("ZIT C", 21, 105, 100));

        MvcTestResult taken = send("post", "/api/attendance/locations", hr, place("zit c", 10, 106, 100));
        assertThat(taken).hasStatus(400);
        assertThat(JsonPath.<String>read(body(taken), "$.code")).isEqualTo("validation.invalid");
        assertThat(JsonPath.<List<String>>read(body(taken), "$.errors[?(@.field == 'name')].code"))
                .containsExactly("taken");

        MvcTestResult bad = send("post", "/api/attendance/locations", hr, """
                {"name": "", "latitude": 91, "longitude": -181, "radiusMeters": 49}""");
        assertThat(bad).hasStatus(400);
        assertThat(JsonPath.<List<String>>read(body(bad), "$.errors[*].field"))
                .containsExactly("name", "latitude", "longitude", "radiusMeters");
        assertThat(JsonPath.<List<String>>read(body(bad), "$.errors[*].code"))
                .containsExactly("required", "out_of_range", "out_of_range", "out_of_range");

        MvcTestResult missing = send("post", "/api/attendance/locations", hr, "{\"name\": \"ZIT D\"}");
        assertThat(JsonPath.<List<String>>read(body(missing), "$.errors[*].field"))
                .containsExactly("latitude", "longitude", "radiusMeters");
        assertThat(send("post", "/api/attendance/locations", hr, place("ZIT D", 21, 105, 1001))).hasStatus(400);
        assertThat(send("post", "/api/attendance/locations", hr, place("ZIT D", 21, 105, 1000))).hasStatus(201);
        assertThat(send("post", "/api/attendance/locations", hr, place("ZIT E", -90, 180, 50))).hasStatus(201);
    }

    @Test
    void aLocationIsChangedDeactivatedReactivatedAndFiltered() {
        String id = createdId(place("ZIT F", 21, 105, 100));
        createdId(place("ZIT G", 21, 105, 100));

        MvcTestResult renamed = send("put", "/api/attendance/locations/" + id, hr, place("ZIT F2", 21.5, 105.5, 300));
        assertThat(renamed).hasStatusOk();
        assertThat(JsonPath.<Integer>read(body(renamed), "$.radiusMeters")).isEqualTo(300);
        // Saving under its own name is not "taken".
        assertThat(send("put", "/api/attendance/locations/" + id, hr, place("zit f2", 21.5, 105.5, 300)))
                .hasStatusOk();

        MvcTestResult off = send("post", "/api/attendance/locations/" + id + "/deactivate", hr, null);
        assertThat(JsonPath.<Boolean>read(body(off), "$.active")).isFalse();
        assertThat(names(get("/api/attendance/locations?active=false", hr))).contains("zit f2")
                .doesNotContain("ZIT G");
        assertThat(names(get("/api/attendance/locations?active=true", hr))).contains("ZIT G")
                .doesNotContain("zit f2");
        assertThat(names(get("/api/attendance/locations", hr))).contains("zit f2", "ZIT G");

        MvcTestResult on = send("post", "/api/attendance/locations/" + id + "/reactivate", hr, null);
        assertThat(JsonPath.<Boolean>read(body(on), "$.active")).isTrue();
    }

    @Test
    void anUnknownLocationIsNotFound() {
        MvcTestResult missing = get("/api/attendance/locations/" + UUID.randomUUID(), hr);

        assertThat(missing).hasStatus(404);
        assertThat(JsonPath.<String>read(body(missing), "$.code")).isEqualTo("attendance_location.not_found");
    }

    @Test
    void everyChangeOfALocationIsInTheAuditLog() {
        String id = createdId(place("ZIT H", 21, 105, 100));
        send("put", "/api/attendance/locations/" + id, hr, place("ZIT H", 21, 105, 250));
        send("post", "/api/attendance/locations/" + id + "/deactivate", hr, null);

        MvcTestResult log = get("/api/audit-logs?entityType=ATTENDANCE_LOCATION&entityId=" + id, admin);

        assertThat(log).hasStatusOk();
        assertThat(JsonPath.<Integer>read(body(log), "$.total")).isEqualTo(3);
        String updateId = jdbc.queryForObject("""
                select id::text from audit_log where entity_type = 'ATTENDANCE_LOCATION' and entity_id = ?::uuid
                  and summary = 'Check-in location ZIT H changed'""", String.class, id);
        String detail = body(get("/api/audit-logs/" + updateId, admin));
        assertThat(JsonPath.<Integer>read(detail, "$.before.radiusMeters")).isEqualTo(100);
        assertThat(JsonPath.<Integer>read(detail, "$.after.radiusMeters")).isEqualTo(250);
    }

    @Test
    void theRulesStartAtTheDefaultAndASavedChangeIsAudited() {
        MvcTestResult defaults = get("/api/attendance/mobile-checkin-settings", hr);
        assertThat(defaults).hasStatusOk();
        assertThat(JsonPath.<Integer>read(body(defaults), "$.maxAccuracyMeters")).isEqualTo(100);
        assertThat(JsonPath.<Integer>read(body(defaults), "$.defaultMaxAccuracyMeters")).isEqualTo(100);
        assertThat(JsonPath.<Boolean>read(body(defaults), "$.customized")).isFalse();
        assertThat(JsonPath.<Boolean>read(body(defaults), "$.everyEmployee")).isTrue();
        assertThat(JsonPath.<Boolean>read(body(defaults), "$.photoRequired")).isTrue();
        long before = auditCount();

        MvcTestResult saved = send("put", "/api/attendance/mobile-checkin-settings", hr,
                "{\"maxAccuracyMeters\": 50}");
        assertThat(saved).hasStatusOk();
        assertThat(JsonPath.<Integer>read(body(saved), "$.maxAccuracyMeters")).isEqualTo(50);
        assertThat(JsonPath.<Boolean>read(body(saved), "$.customized")).isTrue();
        assertThat(JsonPath.<String>read(body(saved), "$.updatedByName")).isNotBlank();
        assertThat(JsonPath.<Integer>read(body(get("/api/attendance/mobile-checkin-settings", admin)),
                "$.maxAccuracyMeters")).isEqualTo(50);
        assertThat(auditCount()).isEqualTo(before + 1);

        // Saving the same value again writes no record.
        send("put", "/api/attendance/mobile-checkin-settings", hr, "{\"maxAccuracyMeters\": 50}");
        assertThat(auditCount()).isEqualTo(before + 1);

        for (String bad : List.of("{}", "{\"maxAccuracyMeters\": 9}", "{\"maxAccuracyMeters\": 1001}")) {
            MvcTestResult refused = send("put", "/api/attendance/mobile-checkin-settings", hr, bad);
            assertThat(refused).hasStatus(400);
            assertThat(JsonPath.<List<String>>read(body(refused), "$.errors[*].field"))
                    .containsExactly("maxAccuracyMeters");
        }
    }

    // --- helpers ---

    long auditCount() {
        return jdbc.queryForObject("select count(*) from audit_log where entity_type = 'MOBILE_CHECKIN_SETTING'",
                Long.class);
    }

    static String place(String name, double latitude, double longitude, int radius) {
        return """
                {"name": "%s", "address": "Khu Công nghệ cao Hòa Lạc", "latitude": %s, "longitude": %s,
                 "radiusMeters": %d}""".formatted(name, latitude, longitude, radius);
    }

    List<String> names(MvcTestResult result) {
        assertThat(result).hasStatusOk();
        return JsonPath.read(body(result), "$[*].name");
    }

    String createdId(String json) {
        MvcTestResult created = send("post", "/api/attendance/locations", hr, json);
        assertThat(created).hasStatus(201);
        return JsonPath.read(body(created), "$.id");
    }

    String signedIn(Role role) {
        return testAccounts.bearer(mvc, testAccounts.create(role));
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
