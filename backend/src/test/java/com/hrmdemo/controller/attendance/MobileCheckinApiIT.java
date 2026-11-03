package com.hrmdemo.controller.attendance;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Mobile check-in (HRM-39/BE-3) against real PostgreSQL: consent first, the server's time, inside and outside the
 * place, nothing stored when refused, the audit records, and the counts on the settings page. An is an Employee of
 * unit MC; the company has one active place (ZIT Hòa Lạc, 200 m) and one inactive (ZIT Duy Tân, where An stands in
 * one test).
 */
@IntegrationTest
class MobileCheckinApiIT {

    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final double LAT = 21.0090;
    static final double LON = 105.5290;
    static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16, 'J', 'F', 'I', 'F', 0, 1};

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
    String anBearer;
    String hr;
    String hoaLac;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        UUID unit = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, 'MC', 'MC', 'TEAM', now(), now())""", unit);
        an = testEmployees.create("Nguyễn Văn An", unit);
        TestAccounts.TestAccount account = testAccounts.create(Role.EMPLOYEE);
        testEmployees.link(account.id(), an);
        anBearer = testAccounts.bearer(mvc, account);
        hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));
        hoaLac = place("ZIT Hòa Lạc", LAT, LON, 200);
        String duyTan = place("ZIT Duy Tân", 21.0305, 105.7830, 150);
        assertThat(send("post", "/api/attendance/locations/" + duyTan + "/deactivate", hr, null)).hasStatusOk();
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("delete from org_unit where code = 'MC'");
        jdbc.update("delete from attendance_location where lower(name) like 'zit %'");
        jdbc.update("delete from mobile_checkin_setting");
    }

    @Test
    void aCheckInInsideThePlaceIsANormalPunchAtTheServerTime() {
        accept();
        Instant before = Instant.now().truncatedTo(ChronoUnit.SECONDS);

        // A time sent by the phone is ignored.
        MvcTestResult checkedIn = checkIn(LAT + 120 / 111_195.0, LON, 15, Map.of("punchedAt",
                "2020-01-01T08:00:00+07:00"));

        assertThat(checkedIn).hasStatus(201);
        String body = body(checkedIn);
        assertThat(JsonPath.<String>read(body, "$.source")).isEqualTo("MOBILE");
        assertThat(JsonPath.<String>read(body, "$.location.name")).isEqualTo("ZIT Hòa Lạc");
        assertThat(JsonPath.<Integer>read(body, "$.distanceMeters")).isEqualTo(120);
        assertThat(JsonPath.<Boolean>read(body, "$.outsideLocation")).isFalse();
        assertThat(JsonPath.<Boolean>read(body, "$.lowAccuracy")).isFalse();
        assertThat(JsonPath.<Boolean>read(body, "$.hasPhoto")).isTrue();
        Instant at = OffsetDateTime.parse(JsonPath.read(body, "$.at")).toInstant();
        assertThat(at).isBetween(before, Instant.now());

        Map<String, Object> row = jdbc.queryForMap("""
                select p.source, p.punched_at, p.location_id::text as location, p.accuracy_meters, ph.content_type,
                       ph.size_bytes
                from punch p join punch_photo ph on ph.punch_id = p.id where p.employee_id = ?""", an);
        assertThat(row).containsEntry("source", "MOBILE").containsEntry("location", hoaLac)
                .containsEntry("accuracy_meters", 15.0).containsEntry("content_type", "image/jpeg")
                .containsEntry("size_bytes", JPEG.length);
        assertThat(((java.sql.Timestamp) row.get("punched_at")).toInstant()).isEqualTo(at);
    }

    @Test
    void outsideTheRadiusOrWithLowAccuracyTheCheckInIsStoredAndMarked() {
        accept();

        // 1.4 km away, and the inactive Duy Tân does not count even when standing on it.
        String far = body(checkIn(LAT + 1_400 / 111_195.0, LON, 20, Map.of()));
        assertThat(JsonPath.<Boolean>read(far, "$.outsideLocation")).isTrue();
        assertThat(JsonPath.<Integer>read(far, "$.distanceMeters")).isEqualTo(1_400);

        jdbc.update("update punch set punched_at = punched_at - interval '1 minute' where employee_id = ?", an);
        String onOldOffice = body(checkIn(21.0305, 105.7830, 5, Map.of()));
        assertThat(JsonPath.<Boolean>read(onOldOffice, "$.outsideLocation")).isTrue();
        assertThat(JsonPath.<String>read(onOldOffice, "$.location.name")).isEqualTo("ZIT Hòa Lạc");

        jdbc.update("update punch set punched_at = punched_at - interval '1 minute' where employee_id = ?", an);
        assertThat(send("put", "/api/attendance/mobile-checkin-settings", hr, "{\"maxAccuracyMeters\": 30}"))
                .hasStatusOk();
        String blurry = body(checkIn(LAT, LON, 45, Map.of()));
        assertThat(JsonPath.<Boolean>read(blurry, "$.lowAccuracy")).isTrue();
        assertThat(JsonPath.<Boolean>read(blurry, "$.outsideLocation")).isFalse();

        assertThat(jdbc.queryForObject("select count(*) from punch where employee_id = ? and outside_location",
                Integer.class, an)).isEqualTo(2);
    }

    @Test
    void withoutConsentOrWithoutAPhotoNothingIsStored() {
        MvcTestResult noConsent = checkIn(LAT, LON, 10, Map.of());
        assertThat(noConsent).hasStatus(403);
        assertThat(JsonPath.<String>read(body(noConsent), "$.code")).isEqualTo("mobile_checkin.consent_required");

        accept();
        MvcTestResult noPhoto = mvc.post().uri("/api/attendance/mobile-checkin")
                .header(HttpHeaders.AUTHORIZATION, anBearer).multipart().param("latitude", String.valueOf(LAT))
                .exchange();
        assertThat(noPhoto).hasStatus(400);
        assertThat(JsonPath.<List<String>>read(body(noPhoto), "$.errors[*].field"))
                .containsExactly("photo", "longitude", "accuracyMeters");

        MvcTestResult fake = mvc.post().uri("/api/attendance/mobile-checkin")
                .header(HttpHeaders.AUTHORIZATION, anBearer).multipart()
                .file(new MockMultipartFile("photo", "a.jpg", "image/jpeg", "not an image".getBytes()))
                .param("latitude", String.valueOf(LAT)).param("longitude", String.valueOf(LON))
                .param("accuracyMeters", "10").exchange();
        assertThat(JsonPath.<List<String>>read(body(fake), "$.errors[*].code")).containsExactly("unsupported");

        assertThat(jdbc.queryForObject("select count(*) from punch where employee_id = ?", Integer.class, an))
                .isZero();
        assertThat(jdbc.queryForObject("select count(*) from punch_photo", Integer.class)).isZero();
    }

    @Test
    void theConsentIsStoredWithItsDateCanBeWithdrawnAndAcceptedAgain() {
        String none = body(get("/api/attendance/mobile-checkin/consent", anBearer));
        assertThat(JsonPath.<Boolean>read(none, "$.accepted")).isFalse();
        assertThat(JsonPath.<Integer>read(none, "$.currentNoticeVersion")).isEqualTo(1);

        accept();
        assertThat(jdbc.queryForObject("select count(*) from mobile_checkin_consent where employee_id = ?"
                + " and withdrawn_at is null", Integer.class, an)).isEqualTo(1);
        assertThat(JsonPath.<Integer>read(body(get("/api/attendance/mobile-checkin-settings", hr)),
                "$.consentCount")).isEqualTo(1);

        String withdrawn = body(send("delete", "/api/attendance/mobile-checkin/consent", anBearer, null));
        assertThat(JsonPath.<Boolean>read(withdrawn, "$.accepted")).isFalse();
        assertThat(JsonPath.<String>read(withdrawn, "$.withdrawnAt")).isNotNull();
        assertThat(checkIn(LAT, LON, 10, Map.of())).hasStatus(403);

        accept();
        assertThat(checkIn(LAT, LON, 10, Map.of())).hasStatus(201);
        assertThat(jdbc.queryForObject("""
                select count(*) from audit_log where entity_type = 'MOBILE_CHECKIN_CONSENT'
                  and entity_id = (select id from mobile_checkin_consent where employee_id = ?)""", Integer.class, an))
                .isEqualTo(3);

        MvcTestResult outdated = send("post", "/api/attendance/mobile-checkin/consent", anBearer,
                "{\"noticeVersion\": 0}");
        assertThat(outdated).hasStatus(400);
    }

    @Test
    void theCardShowsTodaysPunchesAndTheLocateCallStoresNothing() {
        accept();
        String empty = body(get("/api/attendance/mobile-checkin", anBearer));
        assertThat(JsonPath.<String>read(empty, "$.nextLabel")).isEqualTo("IN");
        assertThat(JsonPath.<Boolean>read(empty, "$.consent.accepted")).isTrue();
        assertThat(JsonPath.<Integer>read(empty, "$.maxAccuracyMeters")).isEqualTo(100);

        String located = body(get("/api/attendance/mobile-checkin/locate?latitude=" + LAT + "&longitude=" + LON
                + "&accuracyMeters=12", anBearer));
        assertThat(JsonPath.<String>read(located, "$.location.name")).isEqualTo("ZIT Hòa Lạc");
        assertThat(JsonPath.<Boolean>read(located, "$.outsideLocation")).isFalse();
        assertThat(jdbc.queryForObject("select count(*) from punch where employee_id = ?", Integer.class, an))
                .isZero();

        checkIn(LAT, LON, 10, Map.of());
        String card = body(get("/api/attendance/mobile-checkin", anBearer));
        assertThat(JsonPath.<List<String>>read(card, "$.punches[*].source")).containsExactly("MOBILE");
        assertThat(JsonPath.<String>read(card, "$.nextLabel")).isEqualTo("OUT");
        assertThat(JsonPath.<List<Integer>>read(body(get("/api/attendance/locations", hr)),
                "$[?(@.name == 'ZIT Hòa Lạc')].punchesLast30Days")).containsExactly(1);
    }

    @Test
    void everyCheckInIsAuditedWithoutTheCoordinates() {
        accept();
        String id = JsonPath.read(body(checkIn(LAT, LON, 10, Map.of())), "$.id");

        Map<String, Object> record = jdbc.queryForMap("""
                select summary, after_values::text as after from audit_log
                where entity_type = 'MOBILE_CHECKIN' and entity_id = ?::uuid""", id);
        assertThat(record).containsEntry("summary", "Mobile check-in");
        assertThat((String) record.get("after")).contains("ZIT Hòa Lạc").doesNotContain("latitude")
                .doesNotContain("longitude");
    }

    @Test
    void anAccountWithoutAnEmployeeCannotCheckIn() {
        MvcTestResult refused = get("/api/attendance/mobile-checkin", hr);

        assertThat(refused).hasStatus(403);
        assertThat(JsonPath.<String>read(body(refused), "$.code")).isEqualTo("mobile_checkin.no_employee");
    }

    // --- helpers ---

    void accept() {
        assertThat(send("post", "/api/attendance/mobile-checkin/consent", anBearer, "{\"noticeVersion\": 1}"))
                .hasStatusOk();
    }

    MvcTestResult checkIn(double latitude, double longitude, double accuracy, Map<String, String> extra) {
        var request = mvc.post().uri("/api/attendance/mobile-checkin").header(HttpHeaders.AUTHORIZATION, anBearer)
                .multipart().file(new MockMultipartFile("photo", "photo.jpg", "image/jpeg", JPEG))
                .param("latitude", String.valueOf(latitude)).param("longitude", String.valueOf(longitude))
                .param("accuracyMeters", String.valueOf(accuracy));
        for (Map.Entry<String, String> entry : extra.entrySet()) {
            request = request.param(entry.getKey(), entry.getValue());
        }
        return request.exchange();
    }

    String place(String name, double latitude, double longitude, int radius) {
        MvcTestResult created = send("post", "/api/attendance/locations", hr, """
                {"name": "%s", "latitude": %s, "longitude": %s, "radiusMeters": %d}"""
                .formatted(name, latitude, longitude, radius));
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
