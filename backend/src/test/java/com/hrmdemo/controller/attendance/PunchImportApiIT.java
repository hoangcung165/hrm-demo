package com.hrmdemo.controller.attendance;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Importing the Log quẹt thẻ against real PostgreSQL: errors per row, safe re-import, night shift times, permissions. */
@IntegrationTest
class PunchImportApiIT {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    UUID unit;
    UUID an;
    UUID binh;
    String anCode;
    String binhCode;
    String hr;
    String director;
    String employee;
    String lineManager;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), 'ZPI', 'Punch import', 'TEAM', now(), now())""",
                unit = UUID.randomUUID());
        an = testEmployees.create("Nguyễn Văn An", unit);
        binh = testEmployees.create("Trần Thị Bình", unit);
        anCode = codeOf(an);
        binhCode = codeOf(binh);
        hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));
        director = testAccounts.bearer(mvc, testAccounts.create(Role.DIRECTOR));
        employee = testAccounts.bearer(mvc, testAccounts.create(Role.EMPLOYEE));
        lineManager = testAccounts.bearer(mvc, testAccounts.create(Role.LINE_MANAGER));
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("delete from org_unit where code = 'ZPI'");
        jdbc.update("delete from punch_import");
    }

    @Test
    void importingTheSameFileAgainStoresNothingNewAndSaysSo() {
        String file = "Mã nhân viên,Thời gian,Máy\n"
                + anCode + ",2026-10-20 08:01:00,Gate A\n"
                + anCode + ",2026-10-20 17:35:00,Gate A\n"
                + binhCode + ",2026-10-20 08:10:00,Gate B\n";

        MvcTestResult first = importFile(hr, file, false, null);
        assertThat(first).hasStatus(201);
        assertThat(JsonPath.<Integer>read(body(first), "$.stored")).isEqualTo(3);
        assertThat(JsonPath.<Integer>read(body(first), "$.alreadyImported")).isZero();
        assertThat(punches()).isEqualTo(3);

        MvcTestResult again = importFile(hr, file, false, null);
        assertThat(again).hasStatus(201);
        assertThat(JsonPath.<Integer>read(body(again), "$.stored")).isZero();
        assertThat(JsonPath.<Integer>read(body(again), "$.alreadyImported")).isEqualTo(3);
        assertThat(punches()).isEqualTo(3);

        // A file that adds one punch to the old ones stores only that one.
        MvcTestResult more = importFile(hr, file + binhCode + ",2026-10-20 17:40:00,Gate B\n", false, null);
        assertThat(JsonPath.<Integer>read(body(more), "$.stored")).isEqualTo(1);
        assertThat(JsonPath.<Integer>read(body(more), "$.alreadyImported")).isEqualTo(3);
        assertThat(punches()).isEqualTo(4);
        assertThat(jdbc.queryForObject("select count(*) from punch_import", Integer.class)).isEqualTo(3);
        assertThat(jdbc.queryForObject("select count(*) from audit_log where entity_type = 'PUNCH_IMPORT'",
                Integer.class)).isGreaterThanOrEqualTo(3);
    }

    @Test
    void theCheckReportsEachBadRowAndStoresNothing() {
        String file = "code,time\n"
                + anCode + ",2026-10-20 08:00\n"
                + "NOBODY,2026-10-20 08:00\n"
                + anCode + ",not a time\n"
                + anCode + ",2026-10-20 08:00:00\n"
                + binhCode + ",2026-10-20 08:00\n";

        MvcTestResult check = check(hr, file);

        assertThat(check).hasStatusOk();
        String body = body(check);
        assertThat(JsonPath.<Integer>read(body, "$.summary.rowsRead")).isEqualTo(5);
        assertThat(JsonPath.<Integer>read(body, "$.summary.newPunches")).isEqualTo(2);
        assertThat(JsonPath.<Integer>read(body, "$.summary.errorRows")).isEqualTo(3);
        assertThat(JsonPath.<Integer>read(body, "$.summary.employees")).isEqualTo(2);
        assertThat(JsonPath.<List<Integer>>read(body, "$.errors[*].row")).containsExactly(3, 4, 5);
        assertThat(JsonPath.<List<String>>read(body, "$.errors[*].code")).containsExactly("employee_not_found",
                "time_invalid", "duplicate_in_file");
        assertThat(JsonPath.<Integer>read(body, "$.errors[2].firstRow")).isEqualTo(2);
        assertThat(JsonPath.<String>read(body, "$.checksum")).startsWith("sha256:");
        assertThat(punches()).isZero();
    }

    @Test
    void theCheckCountsWhatIsAlreadyStored() {
        String file = "code,time\n" + anCode + ",2026-10-20 08:00\n" + binhCode + ",2026-10-20 08:05\n";
        assertThat(importFile(hr, file, false, null)).hasStatus(201);

        MvcTestResult check = check(hr, file + anCode + ",2026-10-20 17:30\n");

        assertThat(JsonPath.<Integer>read(body(check), "$.summary.alreadyImported")).isEqualTo(2);
        assertThat(JsonPath.<Integer>read(body(check), "$.summary.newPunches")).isEqualTo(1);
        assertThat(punches()).isEqualTo(2);
    }

    @Test
    void aFileWithErrorsIsRefusedWholeUnlessTheBadRowsAreSkipped() {
        String file = "code,time\n" + anCode + ",2026-10-20 08:00\nNOBODY,2026-10-20 08:00\n";

        MvcTestResult refused = importFile(hr, file, false, null);
        assertThat(refused).hasStatus(400);
        assertThat(JsonPath.<String>read(body(refused), "$.code")).isEqualTo("import.rows_invalid");
        assertThat(JsonPath.<Integer>read(body(refused), "$.summary.errorRows")).isEqualTo(1);
        assertThat(punches()).isZero();

        MvcTestResult skipped = importFile(hr, file, true, null);
        assertThat(skipped).hasStatus(201);
        assertThat(JsonPath.<Integer>read(body(skipped), "$.stored")).isEqualTo(1);
        assertThat(JsonPath.<Integer>read(body(skipped), "$.refused")).isEqualTo(1);
        assertThat(punches()).isEqualTo(1);
    }

    @Test
    void aFileWithNothingValidHasNothingToImport() {
        MvcTestResult none = importFile(hr, "code,time\nNOBODY,2026-10-20 08:00\n", true, null);

        assertThat(none).hasStatus(400);
        assertThat(JsonPath.<String>read(body(none), "$.code")).isEqualTo("import.nothing_to_import");
    }

    @Test
    void aNightShiftPairIsStoredAtTheTimesOnTheFile() {
        String file = "code,date,time\n" + anCode + ",20/10/2026,22:01\n" + anCode + ",21/10/2026,06:03\n";

        assertThat(importFile(hr, file, false, null)).hasStatus(201);

        assertThat(jdbc.queryForList("""
                select to_char(punched_at at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') from punch
                where employee_id = ? order by punched_at""", String.class, an))
                .containsExactly("2026-10-20 22:01", "2026-10-21 06:03");
    }

    @Test
    void theChecksumOfTheCheckedFileMustBeTheOneImported() {
        String file = "code,time\n" + anCode + ",2026-10-20 08:00\n";
        String checksum = JsonPath.read(body(check(hr, file)), "$.checksum");

        assertThat(importFile(hr, file, false, checksum)).hasStatus(201);
        MvcTestResult other = importFile(hr, file + binhCode + ",2026-10-20 08:00\n", false, checksum);
        assertThat(other).hasStatus(409);
        assertThat(JsonPath.<String>read(body(other), "$.code")).isEqualTo("import.file_changed");
        assertThat(punches()).isEqualTo(1);
    }

    @Test
    void fileProblemsHaveTheirOwnCodes() {
        MvcTestResult headers = check(hr, "name,device\nAn,A\n");
        assertThat(headers).hasStatus(400);
        assertThat(JsonPath.<String>read(body(headers), "$.code")).isEqualTo("import.headers_invalid");
        assertThat(JsonPath.<String>read(body(check(hr, "code,time\n")), "$.code")).isEqualTo("import.empty");
        assertThat(JsonPath.<String>read(body(mvc.post().uri("/api/attendance/punch-imports/check")
                .header(HttpHeaders.AUTHORIZATION, hr).multipart().exchange()), "$.code"))
                .isEqualTo("import.file_missing");
        MvcTestResult large = check(hr, new byte[5 * 1024 * 1024 + 1]);
        assertThat(large).hasStatus(413);
        assertThat(JsonPath.<String>read(body(large), "$.code")).isEqualTo("import.file_too_large");
    }

    @Test
    void onlyThoseWithAttendanceImportMayCheckOrImportAndTheyMustBeSignedIn() {
        String file = "code,time\n" + anCode + ",2026-10-20 08:00\n";
        for (String bearer : List.of(director, lineManager, employee)) {
            assertThat(check(bearer, file)).hasStatus(403);
            assertThat(importFile(bearer, file, false, null)).hasStatus(403);
        }
        assertThat(mvc.post().uri("/api/attendance/punch-imports/check").multipart()
                .file(new MockMultipartFile("file", "x.csv", "text/csv", file.getBytes(StandardCharsets.UTF_8)))
                .exchange()).hasStatus(401);
        assertThat(punches()).isZero();
    }

    private MvcTestResult check(String bearer, String csv) {
        return check(bearer, csv.getBytes(StandardCharsets.UTF_8));
    }

    private MvcTestResult check(String bearer, byte[] content) {
        return mvc.post().uri("/api/attendance/punch-imports/check").header(HttpHeaders.AUTHORIZATION, bearer)
                .multipart().file(new MockMultipartFile("file", "log.csv", "text/csv", content)).exchange();
    }

    private MvcTestResult importFile(String bearer, String csv, boolean skipInvalid, String checksum) {
        var request = mvc.post().uri("/api/attendance/punch-imports").header(HttpHeaders.AUTHORIZATION, bearer)
                .multipart().file(new MockMultipartFile("file", "log.csv", "text/csv",
                        csv.getBytes(StandardCharsets.UTF_8)))
                .param("skipInvalid", String.valueOf(skipInvalid));
        if (checksum != null) {
            request = request.param("checksum", checksum);
        }
        return request.exchange();
    }

    private String codeOf(UUID employeeId) {
        return jdbc.queryForObject("select code from employee where id = ?", String.class, employeeId);
    }

    private int punches() {
        return jdbc.queryForObject("select count(*) from punch", Integer.class);
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }
}
