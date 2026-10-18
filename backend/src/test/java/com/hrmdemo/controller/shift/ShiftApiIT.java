package com.hrmdemo.controller.shift;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.List;

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

/** Ca làm việc against real PostgreSQL: who may read and change, the validation, deactivation and the Audit log. */
@IntegrationTest
class ShiftApiIT {

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
        jdbc.update("delete from shift where code like 'ZIT%'");
    }

    @Test
    void hrAddsAShiftAndItComesBackWithItsDerivedMinutes() {
        MvcTestResult created = send("post", "/api/shifts", hr, day("zit-hc", "Hành chính"));

        assertThat(created).hasStatus(201);
        String body = body(created);
        assertThat(JsonPath.<String>read(body, "$.code")).isEqualTo("ZIT-HC");
        assertThat(JsonPath.<String>read(body, "$.startTime")).isEqualTo("08:00");
        assertThat(JsonPath.<String>read(body, "$.breakEnd")).isEqualTo("13:00");
        assertThat(JsonPath.<Integer>read(body, "$.scheduledMinutes")).isEqualTo(480);
        assertThat(JsonPath.<Integer>read(body, "$.nightMinutes")).isZero();
        assertThat(JsonPath.<Boolean>read(body, "$.crossesMidnight")).isFalse();
        assertThat(JsonPath.<Boolean>read(body, "$.active")).isTrue();

        MvcTestResult read = get("/api/shifts/" + JsonPath.read(body, "$.id"), director);
        assertThat(read).hasStatusOk();
        assertThat(JsonPath.<String>read(body(read), "$.roundingMode")).isEqualTo("NEAREST");
    }

    @Test
    void aNightShiftCrossesMidnightAndKeepsItsBreakInside() {
        MvcTestResult created = send("post", "/api/shifts", admin, """
                {"code": "ZIT-DEM", "name": "Ca đêm", "startTime": "22:00", "endTime": "06:00",
                 "breakStart": "01:00", "breakEnd": "02:00", "lateToleranceMinutes": 0, "earlyToleranceMinutes": 0,
                 "roundingMode": "NONE"}""");

        assertThat(created).hasStatus(201);
        assertThat(JsonPath.<Boolean>read(body(created), "$.crossesMidnight")).isTrue();
        assertThat(JsonPath.<Integer>read(body(created), "$.scheduledMinutes")).isEqualTo(420);
        assertThat(JsonPath.<Integer>read(body(created), "$.nightMinutes")).isEqualTo(420);
        assertThat(JsonPath.<Object>read(body(created), "$.roundingMinutes")).isNull();
    }

    @Test
    void onlyAdminAndHrChangeAndTheDirectorAndLineManagerOnlyRead() {
        assertThat(send("post", "/api/shifts", director, day("zit-a", "A"))).hasStatus(403);
        assertThat(send("post", "/api/shifts", lineManager, day("zit-a", "A"))).hasStatus(403);
        assertThat(send("post", "/api/shifts", employee, day("zit-a", "A"))).hasStatus(403);
        String id = createdId(day("zit-b", "B"));

        assertThat(send("put", "/api/shifts/" + id, director, day("zit-b", "B2"))).hasStatus(403);
        assertThat(send("post", "/api/shifts/" + id + "/deactivate", lineManager, null)).hasStatus(403);
        assertThat(get("/api/shifts", director)).hasStatusOk();
        assertThat(get("/api/shifts", lineManager)).hasStatusOk();
        assertThat(get("/api/shifts", employee)).hasStatus(403);
        assertThat(get("/api/shifts/" + id, employee)).hasStatus(403);
    }

    @Test
    void invalidValuesAreListedByFieldAndATakenCodeIsRefused() {
        createdId(day("zit-c", "C"));

        MvcTestResult taken = send("post", "/api/shifts", hr, day("ZIT-C", "C again"));
        assertThat(taken).hasStatus(400);
        assertThat(JsonPath.<String>read(body(taken), "$.code")).isEqualTo("validation.invalid");
        assertThat(JsonPath.<List<String>>read(body(taken), "$.errors[?(@.field == 'code')].code"))
                .containsExactly("taken");

        MvcTestResult bad = send("post", "/api/shifts", hr, """
                {"code": "ZIT-D", "name": "D", "startTime": "08:00", "endTime": "08:00",
                 "breakStart": "09:00", "lateToleranceMinutes": 200, "earlyToleranceMinutes": 0,
                 "roundingMode": "UP", "roundingMinutes": 7}""");
        assertThat(bad).hasStatus(400);
        assertThat(JsonPath.<List<String>>read(body(bad), "$.errors[*].field")).contains("endTime", "breakEnd",
                "lateToleranceMinutes", "roundingMinutes");

        MvcTestResult outside = send("post", "/api/shifts", hr, """
                {"code": "ZIT-E", "name": "E", "startTime": "08:00", "endTime": "17:00",
                 "breakStart": "17:00", "breakEnd": "18:00", "lateToleranceMinutes": 0, "earlyToleranceMinutes": 0,
                 "roundingMode": "NONE"}""");
        assertThat(outside).hasStatus(400);
        assertThat(JsonPath.<List<String>>read(body(outside), "$.errors[?(@.field == 'breakStart')].code"))
                .containsExactly("outside_shift");
    }

    @Test
    void aShiftIsChangedKeepsItsCodeIsTurnedOffAndOnAndFilteredByActive() {
        String id = createdId(day("zit-f", "F"));

        MvcTestResult changed = send("put", "/api/shifts/" + id, hr, """
                {"code": "SOMETHING-ELSE", "name": "F sớm", "startTime": "07:00", "endTime": "16:00",
                 "lateToleranceMinutes": 15, "earlyToleranceMinutes": 15, "roundingMode": "DOWN",
                 "roundingMinutes": 30}""");
        assertThat(changed).hasStatusOk();
        assertThat(JsonPath.<String>read(body(changed), "$.code")).isEqualTo("ZIT-F");
        assertThat(JsonPath.<Object>read(body(changed), "$.breakStart")).isNull();
        assertThat(JsonPath.<Integer>read(body(changed), "$.scheduledMinutes")).isEqualTo(540);

        assertThat(send("post", "/api/shifts/" + id + "/deactivate", hr, null)).hasStatusOk();
        assertThat(JsonPath.<List<String>>read(body(get("/api/shifts?active=true", hr)), "$[*].code"))
                .doesNotContain("ZIT-F");
        assertThat(JsonPath.<List<String>>read(body(get("/api/shifts?active=false", hr)), "$[*].code"))
                .contains("ZIT-F");
        assertThat(JsonPath.<Boolean>read(body(get("/api/shifts/" + id, hr)), "$.active")).isFalse();

        assertThat(send("post", "/api/shifts/" + id + "/reactivate", hr, null)).hasStatusOk();
        assertThat(JsonPath.<List<String>>read(body(get("/api/shifts?active=true", hr)), "$[*].code"))
                .contains("ZIT-F");
        assertThat(send("delete", "/api/shifts/" + id, admin, null).getResponse().getStatus()).isIn(404, 405);
    }

    @Test
    void anUnknownShiftIsNotFound() {
        MvcTestResult missing = get("/api/shifts/" + java.util.UUID.randomUUID(), hr);

        assertThat(missing).hasStatus(404);
        assertThat(JsonPath.<String>read(body(missing), "$.code")).isEqualTo("shift.not_found");
    }

    @Test
    void everyChangeIsInTheAuditLogWithBeforeAndAfter() {
        String id = createdId(day("zit-g", "G"));
        send("put", "/api/shifts/" + id, hr, day("zit-g", "G renamed"));
        send("post", "/api/shifts/" + id + "/deactivate", hr, null);

        MvcTestResult log = get("/api/audit-logs?entityType=SHIFT&entityId=" + id, admin);

        assertThat(log).hasStatusOk();
        assertThat(JsonPath.<Integer>read(body(log), "$.total")).isEqualTo(3);
        String updateId = jdbc.queryForObject("""
                select id::text from audit_log where entity_type = 'SHIFT' and entity_id = ?::uuid
                  and summary = 'Shift ZIT-G changed'""", String.class, id);
        String detail = body(get("/api/audit-logs/" + updateId, admin));
        assertThat(JsonPath.<String>read(detail, "$.before.name")).isEqualTo("G");
        assertThat(JsonPath.<String>read(detail, "$.after.name")).isEqualTo("G renamed");
        jdbc.update("delete from shift where code = 'ZIT-G'");
    }

    // --- helpers ---

    static String day(String code, String name) {
        return """
                {"code": "%s", "name": "%s", "startTime": "08:00", "endTime": "17:00", "breakStart": "12:00",
                 "breakEnd": "13:00", "lateToleranceMinutes": 10, "earlyToleranceMinutes": 5,
                 "roundingMode": "NEAREST", "roundingMinutes": 15}""".formatted(code, name);
    }

    String createdId(String json) {
        MvcTestResult created = send("post", "/api/shifts", hr, json);
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
