package com.hrmdemo.controller.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.sql.Date;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
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
 * The people blocks of the Tổng quan page (HRM-20/BE-3) against real PostgreSQL, on a clock fixed to Wednesday
 * 04/11/2026. Nhóm Web: Lê Văn Hùng (Quản lý trực tiếp), Nguyễn Văn An (hired 02/11), Phạm Thị Bình (hired 15/09, last
 * working day 30/10, so inactive). Nhóm QA: Vũ Thị Cúc (hired 01/06). Hùng and the others were hired in 2020.
 */
@IntegrationTest
@Import(DashboardPeopleApiIT.Clocks.class)
class DashboardPeopleApiIT {

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
    UUID qa;
    UUID hung;
    UUID an;
    UUID binh;
    UUID cuc;
    UUID role;
    String annual;

    @BeforeEach
    void setUp() {
        clock.set(WEDNESDAY);
        accounts.clear();
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        web = unit("WEB", "Nhóm Web");
        qa = unit("QA", "Nhóm QA");
        hung = testEmployees.create("Lê Văn Hùng", web);
        an = testEmployees.create("Nguyễn Văn An", web);
        binh = testEmployees.create("Phạm Thị Bình", web);
        cuc = testEmployees.create("Vũ Thị Cúc", qa);
        testEmployees.makeHead(web, hung);
        jdbc.update("update employee set hire_date = ? where id = ?", LocalDate.of(2026, 11, 2), an);
        jdbc.update("update employee set hire_date = ?, status = 'INACTIVE' where id = ?", LocalDate.of(2026, 9, 15),
                binh);
        jdbc.update("update employee set hire_date = ? where id = ?", LocalDate.of(2026, 6, 1), cuc);
        jdbc.update("update employee set hire_date = ? where id = ?", LocalDate.of(2026, 1, 1), hung);
        jdbc.update("""
                insert into resignation (id, legal_entity_id, employee_id, last_working_day, reason, actor_id,
                    created_at)
                values (?, (select id from legal_entity), ?, ?, 'Personal', ?, now())""", UUID.randomUUID(), binh,
                LocalDate.of(2026, 10, 30), UUID.randomUUID());
        role = UUID.randomUUID();
        jdbc.update("""
                insert into catalog_item (id, legal_entity_id, catalog, code, name, search_text, active, created_at,
                    updated_at)
                values (?, (select id from legal_entity), 'PROJECT_ROLE', 'ZRPEOPLE', 'Vai trò thử', 'zrpeople', true,
                    now(), now())""", role);
        annual = jdbc.queryForObject("select id::text from leave_type where code = 'PN'", String.class);
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("delete from catalog_item where catalog = 'PROJECT_ROLE' and code = 'ZRPEOPLE'");
        jdbc.update("delete from org_unit");
    }

    @Test
    void headcountCountsActiveEmployeesPerUnitAndTheLastSixMonthsWithZerosKept() {
        MvcTestResult result = headcount(adminBearer());

        assertThat(result).hasStatusOk();
        assertThat(string(result, "$.date")).isEqualTo("2026-11-04");
        assertThat(strings(result, "$.byUnit[*].orgUnitName")).containsExactly("Nhóm Web", "Nhóm QA");
        assertThat(JsonPath.<List<Integer>>read(body(result), "$.byUnit[*].count")).containsExactly(2, 1);
        assertThat(strings(result, "$.months[*].month")).containsExactly("2026-06", "2026-07", "2026-08", "2026-09",
                "2026-10", "2026-11");
        assertThat(JsonPath.<List<Integer>>read(body(result), "$.months[*].joins")).containsExactly(1, 0, 0, 1, 0, 1);
        assertThat(JsonPath.<List<Integer>>read(body(result), "$.months[*].leaves")).containsExactly(0, 0, 0, 0, 1, 0);
    }

    @Test
    void headcountStaysWithinTheCallersScope() {
        MvcTestResult head = headcount(bearer(hung, Role.LINE_MANAGER));
        assertThat(head).hasStatusOk();
        assertThat(strings(head, "$.byUnit[*].orgUnitName")).containsExactly("Nhóm Web");
        assertThat(JsonPath.<List<Integer>>read(body(head), "$.months[*].leaves")).containsExactly(0, 0, 0, 0, 1, 0);
        // Cúc, who joined in June, is in another unit.
        assertThat(JsonPath.<List<Integer>>read(body(head), "$.months[*].joins")).containsExactly(0, 0, 0, 1, 0, 1);
        assertThat(mvc.get().uri("/api/dashboard/headcount").exchange()).hasStatus(401);
    }

    @Test
    void teamListsTheActiveMembersWithThisWeeksLoadTheSameAsTheHeatmapCellAndTheComingLeave() {
        UUID project = project("ZP-001");
        allocate(project, an, 70, TODAY.minusDays(10), TODAY.plusDays(40));
        allocate(project, an, 50, TODAY.minusDays(2), TODAY.plusDays(5));
        allocate(project, hung, 40, TODAY.minusDays(10), TODAY.plusDays(40));
        allocate(project, cuc, 60, TODAY.minusDays(10), TODAY.plusDays(40));
        // An is away next Monday: approved by Hùng through the same endpoints as the Hộp thư duyệt.
        String leave = submit(an, """
                {"leaveTypeId": "%s", "startDate": "%s", "startPart": "FULL", "endDate": "%s", "endPart": "FULL",
                 "reason": null, "cc":[], "attachmentIds":[]}""".formatted(annual, nextWorkingDay(), nextWorkingDay()));
        assertThat(mvc.post().uri("/api/approvals/{id}/approve", leave)
                .header(HttpHeaders.AUTHORIZATION, bearer(hung, Role.LINE_MANAGER)).contentType(MediaType.APPLICATION_JSON)
                .content("{}").exchange()).hasStatusOk();

        MvcTestResult team = team(bearer(hung, Role.LINE_MANAGER));

        assertThat(team).hasStatusOk();
        assertThat(string(team, "$.weekFrom")).isEqualTo("2026-11-02");
        assertThat(string(team, "$.weekTo")).isEqualTo("2026-11-08");
        // The team is the people the caller manages: not the caller, not Bình (inactive), not Cúc (another unit).
        assertThat(strings(team, "$.members[*].employee.fullName")).containsExactly("Nguyễn Văn An");
        assertThat(JsonPath.<List<Integer>>read(body(team), "$.members[*].load")).containsExactly(120);
        assertThat(JsonPath.<Integer>read(body(team), "$.thresholds.nearFullPercent")).isPositive();
        assertThat(strings(team, "$.members[0].upcomingLeave[*].startDate")).containsExactly(nextWorkingDay().toString());

        MvcTestResult heatmap = mvc.get().uri("/api/resources/heatmap?columns=1")
                .header(HttpHeaders.AUTHORIZATION, adminBearer()).exchange();
        assertThat(JsonPath.<List<List<Integer>>>read(body(heatmap),
                "$.items[?(@.employee.id == '" + an + "')].cells")).containsExactly(List.of(120));
    }

    @Test
    void anAccountThatHeadsNoUnitHasNoTeam() {
        assertThat(team(bearer(an, Role.EMPLOYEE))).hasStatus(403);
        assertThat(team(adminBearer())).hasStatus(403);
        assertThat(mvc.get().uri("/api/dashboard/team").exchange()).hasStatus(401);
    }

    // ------------------------------------------------------------------------------------------------- helpers

    LocalDate nextWorkingDay() {
        LocalDate day = TODAY.plusDays(5);
        while (day.getDayOfWeek() != DayOfWeek.MONDAY || holiday(day)) {
            day = day.plusDays(1);
        }
        return day;
    }

    boolean holiday(LocalDate day) {
        return jdbc.queryForObject("""
                select count(*) from catalog_item where catalog = 'HOLIDAY' and active
                  and start_date <= ? and end_date >= ?""", Long.class, day, day) > 0;
    }

    String submit(UUID employee, String json) {
        MvcTestResult sent = mvc.post().uri("/api/leave-requests")
                .header(HttpHeaders.AUTHORIZATION, bearer(employee, Role.EMPLOYEE))
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
        assertThat(sent).hasStatus(201);
        return JsonPath.read(body(sent), "$.id");
    }

    MvcTestResult headcount(String bearer) {
        return mvc.get().uri("/api/dashboard/headcount").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult team(String bearer) {
        return mvc.get().uri("/api/dashboard/team").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    UUID project(String code) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into project (id, legal_entity_id, code, name, client, search_text, pm_employee_id,
                    org_unit_id, start_date, end_date, status, created_at, updated_at)
                values (?, (select id from legal_entity), ?, 'Du an thu', null, ?, ?, ?, ?, ?, 'ACTIVE', now(), now())""",
                id, code, code.toLowerCase() + " du an thu", hung, web, Date.valueOf(TODAY.minusDays(100)),
                Date.valueOf(TODAY.plusDays(100)));
        return id;
    }

    void allocate(UUID project, UUID employee, int percent, LocalDate from, LocalDate to) {
        jdbc.update("""
                insert into project_allocation (id, legal_entity_id, project_id, employee_id, project_role_id, percent,
                    start_date, end_date, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, ?, ?, ?, ?, now(), now())""", UUID.randomUUID(),
                project, employee, role, percent, Date.valueOf(from), Date.valueOf(to));
    }

    UUID unit(String code, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, ?, ?, 'TEAM', now(), now())""", id, code, name);
        return id;
    }

    String adminBearer() {
        return testAccounts.adminBearer(mvc);
    }

    String bearer(UUID employee, Role role) {
        TestAccounts.TestAccount account = accounts.computeIfAbsent(employee, id -> {
            TestAccounts.TestAccount created = testAccounts.create(role);
            testEmployees.link(created.id(), id);
            return created;
        });
        return testAccounts.bearer(mvc, account);
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
        return ((Number) JsonPath.read(body(result), path)).intValue();
    }

    static List<String> strings(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }
}
