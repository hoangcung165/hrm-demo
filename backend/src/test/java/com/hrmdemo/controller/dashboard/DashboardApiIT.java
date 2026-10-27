package com.hrmdemo.controller.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.MutableClock;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * The Tổng quan reads (HRM-20/BE-1) against real PostgreSQL, on a clock the test fixes to Wednesday 04/11/2026.
 * Nhóm Web: Lê Văn Hùng (head, Quản lý trực tiếp), Nguyễn Văn An, Phạm Thị Bình (Thử việc) and Đỗ Văn Lâm (nghỉ việc).
 * Nhóm Mobile: Cao Minh Trí. Trần Thị Mai (HR) has no unit. An is off Wednesday and Thursday (approved), Trí the
 * Wednesday afternoon (approved) and Friday to Monday (approved), Bình has a request waiting for Wednesday.
 */
@IntegrationTest
@Import(DashboardApiIT.Clocks.class)
class DashboardApiIT {

    /** 10:00 in the company (UTC+7) on Wednesday 04/11/2026. */
    static final Instant WEDNESDAY = Instant.parse("2026-11-04T03:00:00Z");
    static final LocalDate TODAY = LocalDate.of(2026, 11, 4);

    @TestConfiguration(proxyBeanMethods = false)
    static class Clocks {

        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(WEDNESDAY);
        }
    }

    @Autowired
    MockMvcTester mvc;
    @Autowired
    MutableClock clock;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    final Map<UUID, TestAccounts.TestAccount> accounts = new HashMap<>();
    UUID web;
    UUID mobile;
    UUID hung;
    UUID an;
    UUID tri;
    UUID mai;
    String annual;

    @BeforeEach
    void setUp() {
        clock.set(WEDNESDAY);
        accounts.clear();
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        web = unit("WEB", "Nhóm Web");
        mobile = unit("MOB", "Nhóm Mobile");
        hung = testEmployees.create("Lê Văn Hùng", web);
        an = testEmployees.create("Nguyễn Văn An", web);
        UUID binh = testEmployees.create("Phạm Thị Bình", web, "PROBATION");
        testEmployees.create("Đỗ Văn Lâm", web, "INACTIVE");
        tri = testEmployees.create("Cao Minh Trí", mobile);
        mai = testEmployees.create("Trần Thị Mai", null);
        testEmployees.makeHead(web, hung);
        testEmployees.makeHead(mobile, mai);
        annual = jdbc.queryForObject("select id::text from leave_type where code = 'PN'", String.class);

        String hungBearer = signedIn(hung, Role.LINE_MANAGER);
        String maiBearer = signedIn(mai, Role.HR);
        String anRequest = submit(signedIn(an, Role.EMPLOYEE), request(TODAY, "FULL", TODAY.plusDays(1), "FULL"));
        assertThat(approve(hungBearer, anRequest)).hasStatusOk();
        String triRequests = submit(signedIn(tri, Role.EMPLOYEE), request(TODAY, "AFTERNOON", TODAY, "AFTERNOON"));
        assertThat(approve(maiBearer, triRequests)).hasStatusOk();
        // Friday to Monday: the weekend in between is not leave.
        String triLong = submit(signedIn(tri, Role.EMPLOYEE),
                request(TODAY.plusDays(2), "FULL", TODAY.plusDays(5), "FULL"));
        assertThat(approve(maiBearer, triLong)).hasStatusOk();
        submit(signedIn(binh, Role.EMPLOYEE), request(TODAY, "FULL", TODAY, "FULL"));
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("delete from org_unit");
    }

    @Test
    void theCompanyTilesCountEveryActiveEmployeeAndTheLeaveOfToday() {
        MvcTestResult tiles = tiles(signedIn(mai, Role.HR));

        assertThat(tiles).hasStatusOk();
        assertThat(string(tiles, "$.date")).isEqualTo("2026-11-04");
        // Hùng, An, Bình, Trí and Mai; Lâm left the company.
        assertThat(integer(tiles, "$.employees")).isEqualTo(5);
        assertThat(integer(tiles, "$.inProbation")).isEqualTo(1);
        // An all day and Trí in the afternoon are off; Bình's request is still waiting, so it counts for nothing.
        assertThat(integer(tiles, "$.onLeaveToday")).isEqualTo(2);
        // Someone off half a day still works the other half.
        assertThat(integer(tiles, "$.workingToday")).isEqualTo(4);
    }

    @Test
    void aLineManagerCountsTheirUnitAndBelowAndNothingElse() {
        MvcTestResult tiles = tiles(signedIn(hung, Role.LINE_MANAGER));

        assertThat(tiles).hasStatusOk();
        assertThat(integer(tiles, "$.employees")).isEqualTo(3);
        assertThat(integer(tiles, "$.inProbation")).isEqualTo(1);
        assertThat(integer(tiles, "$.onLeaveToday")).isEqualTo(1);
        assertThat(integer(tiles, "$.workingToday")).isEqualTo(2);
    }

    @Test
    void anAccountThatCannotOpenTheEmployeeListGetsNoTiles() {
        assertThat(tiles(signedIn(an, Role.EMPLOYEE))).hasStatus(403);
        UUID quan = testEmployees.create("Vũ Minh Quân", null);
        assertThat(tiles(signedIn(quan, Role.PROJECT_MANAGER))).hasStatus(403);
        assertThat(mvc.get().uri("/api/dashboard/tiles").exchange()).hasStatus(401);
        assertThat(mvc.get().uri("/api/dashboard/leave-today").exchange()).hasStatus(401);
    }

    @Test
    void leaveTodayListsTheApprovedOnesByNameWithThePartAndTheLastDay() {
        MvcTestResult today = leaveToday(signedIn(mai, Role.HR));

        assertThat(today).hasStatusOk();
        assertThat(string(today, "$.date")).isEqualTo("2026-11-04");
        assertThat(strings(today, "$.entries[*].employee.fullName")).containsExactly("Cao Minh Trí",
                "Nguyễn Văn An");
        assertThat(strings(today, "$.entries[?(@.employee.fullName == 'Nguyễn Văn An')].part"))
                .containsExactly("FULL");
        assertThat(strings(today, "$.entries[?(@.employee.fullName == 'Nguyễn Văn An')].until"))
                .containsExactly("2026-11-05");
        assertThat(strings(today, "$.entries[?(@.employee.fullName == 'Cao Minh Trí')].part"))
                .containsExactly("AFTERNOON");
        assertThat(strings(today, "$.entries[*].employee.orgUnitName")).containsExactly("Nhóm Mobile", "Nhóm Web");
        assertThat(strings(today, "$.entries[*].leaveType.name")).hasSize(2);
        // Bình's request is waiting: not leave yet.
        assertThat(strings(today, "$.entries[?(@.employee.fullName == 'Phạm Thị Bình')].part")).isEmpty();
    }

    @Test
    void leaveTodayFollowsTheDataScope() {
        assertThat(strings(leaveToday(signedIn(hung, Role.LINE_MANAGER)), "$.entries[*].employee.fullName"))
                .containsExactly("Nguyễn Văn An");
        // An Account without a list permission sees only its own leave.
        assertThat(strings(leaveToday(signedIn(an, Role.EMPLOYEE)), "$.entries[*].employee.fullName"))
                .containsExactly("Nguyễn Văn An");
        assertThat(strings(leaveToday(signedIn(binh(), Role.EMPLOYEE)), "$.entries[*].employee.fullName")).isEmpty();
    }

    @Test
    void aWeekendInsideARequestIsNotLeave() {
        clock.set(Instant.parse("2026-11-07T03:00:00Z"));

        MvcTestResult saturday = leaveToday(signedIn(mai, Role.HR));
        assertThat(saturday).hasStatusOk();
        assertThat(string(saturday, "$.date")).isEqualTo("2026-11-07");
        assertThat(strings(saturday, "$.entries[*].employee.fullName")).isEmpty();
        assertThat(integer(tiles(signedIn(mai, Role.HR)), "$.onLeaveToday")).isZero();

        clock.set(Instant.parse("2026-11-09T03:00:00Z"));
        assertThat(strings(leaveToday(signedIn(mai, Role.HR)), "$.entries[*].employee.fullName"))
                .containsExactly("Cao Minh Trí");
    }

    @Test
    void todayIsTheCompanysDayNotTheServers() {
        // 18:00 UTC on Wednesday is already 01:00 on Thursday in the company.
        clock.set(Instant.parse("2026-11-04T18:00:00Z"));

        MvcTestResult today = leaveToday(signedIn(mai, Role.HR));

        assertThat(string(today, "$.date")).isEqualTo("2026-11-05");
        assertThat(strings(today, "$.entries[*].employee.fullName")).containsExactly("Nguyễn Văn An");
    }

    UUID binh() {
        return jdbc.queryForObject("select id from employee where full_name = 'Phạm Thị Bình'", UUID.class);
    }

    UUID unit(String code, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, ?, ?, 'TEAM', now(), now())""", id, code, name);
        return id;
    }

    /** One Account per Employee, signed in again on every call so a token never outlives the test's clock. */
    String signedIn(UUID employee, Role role) {
        TestAccounts.TestAccount account = accounts.computeIfAbsent(employee, id -> {
            TestAccounts.TestAccount created = testAccounts.create(role);
            testEmployees.link(created.id(), id);
            return created;
        });
        return testAccounts.bearer(mvc, account);
    }

    String request(LocalDate start, String startPart, LocalDate end, String endPart) {
        return """
                {"leaveTypeId": "%s", "startDate": "%s", "startPart": "%s", "endDate": "%s", "endPart": "%s",
                 "reason": null, "cc":[], "attachmentIds":[]}""".formatted(annual, start, startPart, end, endPart);
    }

    String submit(String bearer, String json) {
        MvcTestResult sent = mvc.post().uri("/api/leave-requests").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
        assertThat(sent).hasStatus(201);
        return JsonPath.read(body(sent), "$.id");
    }

    MvcTestResult approve(String bearer, String id) {
        return mvc.post().uri("/api/approvals/{id}/approve", id).header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content("{}").exchange();
    }

    MvcTestResult tiles(String bearer) {
        return mvc.get().uri("/api/dashboard/tiles").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult leaveToday(String bearer) {
        return mvc.get().uri("/api/dashboard/leave-today").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    static String string(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }

    static int integer(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }

    static List<String> strings(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }
}
