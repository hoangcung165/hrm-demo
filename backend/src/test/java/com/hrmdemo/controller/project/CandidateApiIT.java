package com.hrmdemo.controller.project;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.UnsupportedEncodingException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
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
 * Tìm người (HRM-16/BE-1) against real PostgreSQL, on the search of the approved #16 artboards: React and TypeScript
 * from level 3 on DA-031. Dates are relative to today.
 * <ul>
 * <li>Meeting both: Lê Văn Hùng (free), Ngô Thanh Sơn (left DA-031 before the range), Phan Khánh Duy (30% on DA-027)
 * and Đoàn Minh Tuấn (40% on DA-027 and 70% on DA-029 until {@code T+50}, so 110%).</li>
 * <li>Meeting one: Kiều Văn Thành (no React) and La Văn Khải (TypeScript at level 2, 100% on DA-027).</li>
 * <li>Left out: Cao Minh Trí (a member of DA-031 in the range), Nguyễn Thị Hồng Nhung (both below level 3) and
 * Đào Văn Nghỉ (has left).</li>
 * </ul>
 * Duy has approved leave and Thành a request still waiting.
 */
@IntegrationTest
class CandidateApiIT {

    static final ZoneId COMPANY = ZoneId.of("Asia/Ho_Chi_Minh");
    static final LocalDate T = LocalDate.now(COMPANY);

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    UUID web;
    UUID react;
    UUID typescript;
    UUID role;
    UUID lan;
    UUID da031;
    UUID da029;
    UUID da027;
    String lanBearer;
    String hienBearer;
    String maiBearer;
    String baoBearer;
    String anBearer;
    LocalDate leaveStart;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        web = unit("WEB", "Nhóm Web");
        react = skill("ZSREACT", "React (test)");
        typescript = skill("ZSTS", "TypeScript (test)");
        role = projectRole();

        lan = testEmployees.create("Vũ Thị Lan", null);
        UUID hien = testEmployees.create("Lương Văn Hiển", null);
        UUID mai = testEmployees.create("Trần Thị Mai", null);
        UUID bao = testEmployees.create("Phạm Quốc Bảo", null);
        UUID hung = testEmployees.create("Lê Văn Hùng", web);
        UUID son = testEmployees.create("Ngô Thanh Sơn", web);
        UUID duy = testEmployees.create("Phan Khánh Duy", web);
        UUID tuan = testEmployees.create("Đoàn Minh Tuấn", web);
        UUID thanh = testEmployees.create("Kiều Văn Thành", web);
        UUID khai = testEmployees.create("La Văn Khải", web);
        UUID tri = testEmployees.create("Cao Minh Trí", web);
        UUID nhung = testEmployees.create("Nguyễn Thị Hồng Nhung", web);
        UUID gone = testEmployees.create("Đào Văn Nghỉ", web, "INACTIVE");
        testEmployees.makeHead(web, hung);

        skills(hung, 5, 4);
        skills(son, 5, 5);
        skills(duy, 4, 3);
        skills(tuan, 5, 5);
        skills(khai, 3, 2);
        skills(tri, 4, 4);
        skills(nhung, 2, 2);
        skills(gone, 5, 5);
        skill(thanh, typescript, 4);

        da031 = project("DA-031", lan, T.minusDays(40), T.plusDays(170));
        da029 = project("DA-029", lan, T.minusDays(120), T.plusDays(60));
        da027 = project("DA-027", hien, T.minusDays(160), T.plusDays(50));
        allocate(da031, tri, 60, T.plusDays(4), T.plusDays(80));
        allocate(da031, son, 50, T.minusDays(40), T.minusDays(26));
        allocate(da027, duy, 30, T.minusDays(150), T.plusDays(50));
        allocate(da027, tuan, 40, T.minusDays(150), T.plusDays(50));
        allocate(da029, tuan, 70, T.minusDays(100), T.plusDays(60));
        allocate(da027, khai, 100, T.minusDays(150), T.plusDays(50));

        lanBearer = signedIn(lan, Role.PROJECT_MANAGER);
        hienBearer = signedIn(hien, Role.PROJECT_MANAGER);
        maiBearer = signedIn(mai, Role.HR);
        baoBearer = signedIn(bao, Role.DIRECTOR);
        anBearer = signedIn(testEmployees.create("Nguyễn Văn An", web), Role.EMPLOYEE);

        // Duy's week off is approved by the head of the Web team; Thành's request is left waiting.
        jdbc.update("update employee set hire_date = ? where id in (?, ?)", LocalDate.of(T.getYear(), 1, 1), duy,
                thanh);
        String hungBearer = signedIn(hung, Role.LINE_MANAGER);
        leaveStart = nextMonday(7);
        String duyRequest = submitLeave(signedIn(duy, Role.EMPLOYEE), leaveStart, leaveStart.plusDays(4));
        submitLeave(signedIn(thanh, Role.EMPLOYEE), leaveStart.plusDays(7), leaveStart.plusDays(8));
        assertThat(mvc.post().uri("/api/approvals/{id}/approve", duyRequest)
                .header(HttpHeaders.AUTHORIZATION, hungBearer).contentType(MediaType.APPLICATION_JSON).content("{}")
                .exchange()).hasStatusOk();
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("delete from catalog_item where catalog = 'SKILL' and code like 'ZS%'");
        jdbc.update("delete from catalog_item where catalog = 'PROJECT_ROLE' and code = 'ZRCAND'");
        jdbc.update("delete from org_unit");
    }

    // --- the search ---

    @Test
    void peopleComeBestFitFirstBySkillsMetThenByFreePercent() {
        MvcTestResult found = search(lanBearer, da031, both());

        assertThat(found).hasStatusOk();
        assertThat(found).bodyJson().extractingPath("$.total").isEqualTo(6);
        assertThat(names(found)).containsExactly("Lê Văn Hùng", "Ngô Thanh Sơn", "Phan Khánh Duy", "Đoàn Minh Tuấn",
                "Kiều Văn Thành", "La Văn Khải");
        assertThat(ints(found, "$.items[*].matched")).containsExactly(2, 2, 2, 2, 1, 1);
        assertThat(ints(found, "$.items[*].required")).containsOnly(2);
        assertThat(ints(found, "$.items[*].freePercent")).containsExactly(100, 100, 70, 0, 100, 0);
    }

    @Test
    void sortingByFreePercentPutsTheMostFreeFirst() {
        MvcTestResult found = search(lanBearer, da031, both() + "&sort=free");

        assertThat(names(found)).containsExactly("Lê Văn Hùng", "Ngô Thanh Sơn", "Kiều Văn Thành", "Phan Khánh Duy",
                "Đoàn Minh Tuấn", "La Văn Khải");
    }

    @Test
    void theFreeFigureIsTheBusiestDayAndAnOverloadIsFlagged() {
        MvcTestResult found = search(lanBearer, da031, both());

        assertThat(found).bodyJson().extractingPath("$.items[2].peakLoad").isEqualTo(30);
        assertThat(found).bodyJson().extractingPath("$.items[2].overloaded").isEqualTo(false);
        assertThat(found).bodyJson().extractingPath("$.items[3].employee.fullName").isEqualTo("Đoàn Minh Tuấn");
        assertThat(found).bodyJson().extractingPath("$.items[3].peakLoad").isEqualTo(110);
        assertThat(found).bodyJson().extractingPath("$.items[3].freePercent").isEqualTo(0);
        assertThat(found).bodyJson().extractingPath("$.items[3].overloaded").isEqualTo(true);
        // Khải is exactly full: no free time, but not overloaded.
        assertThat(found).bodyJson().extractingPath("$.items[5].peakLoad").isEqualTo(100);
        assertThat(found).bodyJson().extractingPath("$.items[5].overloaded").isEqualTo(false);
    }

    @Test
    void theMonthlyStripShowsTheBusiestDayOfEachMonthOfTheRange() {
        MvcTestResult found = search(lanBearer, da031, both());

        assertThat(strings(found, "$.items[3].months[*].month")).first().isEqualTo(YearMonth.from(T).toString());
        assertThat(ints(found, "$.items[3].months[*].peakPercent")).contains(110).endsWith(0);
        assertThat(ints(found, "$.items[0].months[*].peakPercent")).containsOnly(0);
        // One entry per month from today to the project's last day, for everyone.
        int months = (int) (YearMonth.from(T).until(YearMonth.from(T.plusDays(170)),
                java.time.temporal.ChronoUnit.MONTHS) + 1);
        assertThat(strings(found, "$.items[0].months[*].month")).hasSize(months);
    }

    @Test
    void everyRequiredSkillIsReportedAgainstThePerson() {
        MvcTestResult found = search(lanBearer, da031, both());

        // Duy: both met, at his levels.
        assertThat(strings(found, "$.items[2].skills[*].name")).containsExactly("React (test)", "TypeScript (test)");
        assertThat(ints(found, "$.items[2].skills[*].level")).containsExactly(4, 3);
        assertThat(ints(found, "$.items[2].skills[*].minLevel")).containsExactly(3, 3);
        // Khải: React met, TypeScript below the level asked.
        assertThat(found).bodyJson().extractingPath("$.items[5].skills[0].met").isEqualTo(true);
        assertThat(found).bodyJson().extractingPath("$.items[5].skills[1].level").isEqualTo(2);
        assertThat(found).bodyJson().extractingPath("$.items[5].skills[1].met").isEqualTo(false);
        // Thành: no React at all.
        assertThat(found).bodyJson().extractingPath("$.items[4].skills[0].level").isNull();
        assertThat(found).bodyJson().extractingPath("$.items[4].skills[0].met").isEqualTo(false);
        assertThat(found).bodyJson().extractingPath("$.items[4].skills[1].met").isEqualTo(true);
    }

    @Test
    void peopleWhoMeetNoRequiredSkillAreLeftOutAndAHigherLevelNarrowsTheResult() {
        assertThat(names(search(lanBearer, da031, "skills=" + react + ":5"))).containsExactly("Lê Văn Hùng",
                "Ngô Thanh Sơn", "Đoàn Minh Tuấn");
        assertThat(names(search(lanBearer, da031, "skills=" + typescript + ":5"))).containsExactly("Ngô Thanh Sơn",
                "Đoàn Minh Tuấn");
    }

    @Test
    void employeesWhoLeftAndMembersInTheRangeNeverAppearAndMembersAreCounted() {
        MvcTestResult found = search(lanBearer, da031, both());

        assertThat(names(found)).doesNotContain("Cao Minh Trí", "Nguyễn Thị Hồng Nhung", "Đào Văn Nghỉ");
        assertThat(found).bodyJson().extractingPath("$.excludedMembers").isEqualTo(1);
    }

    @Test
    void aMemberWhoseAllocationEndedBeforeTheRangeIsFoundAgain() {
        MvcTestResult found = search(lanBearer, da031, both());

        assertThat(names(found)).contains("Ngô Thanh Sơn");
        // Searching the days of his allocation puts him out and counts him.
        MvcTestResult then = search(lanBearer, da031, both() + "&from=" + T.minusDays(40) + "&to=" + T.minusDays(30));
        assertThat(names(then)).doesNotContain("Ngô Thanh Sơn");
        assertThat(then).bodyJson().extractingPath("$.excludedMembers").isEqualTo(1);
    }

    @Test
    void theRangeDecidesWhichLoadsCount() {
        // After DA-027 ended, Tuấn has only 70% on DA-029 until its last day and Khải is free.
        MvcTestResult later = search(lanBearer, da031, both() + "&from=" + T.plusDays(55) + "&to=" + T.plusDays(100));

        assertThat(later).hasStatusOk();
        assertThat(names(later)).containsExactly("Lê Văn Hùng", "Ngô Thanh Sơn", "Phan Khánh Duy", "Đoàn Minh Tuấn",
                "Kiều Văn Thành", "La Văn Khải");
        assertThat(ints(later, "$.items[*].freePercent")).containsExactly(100, 100, 100, 30, 100, 100);
        assertThat(later).bodyJson().extractingPath("$.items[3].overloaded").isEqualTo(false);
    }

    @Test
    void approvedLeaveInTheRangeIsReturnedForInformationAndNotDeducted() {
        MvcTestResult found = search(lanBearer, da031, both());

        // Duy is the third result: his approved week is listed, and his free time is still 70%.
        assertThat(strings(found, "$.items[2].approvedLeave[*].from")).containsExactly(leaveStart.toString());
        assertThat(strings(found, "$.items[2].approvedLeave[*].to")).containsExactly(leaveStart.plusDays(4).toString());
        assertThat(found).bodyJson().extractingPath("$.items[2].freePercent").isEqualTo(70);
        // Thành's request is still waiting: not listed.
        assertThat(strings(found, "$.items[4].approvedLeave[*].from")).isEmpty();

        MvcTestResult cut = search(lanBearer, da031, both() + "&from=" + leaveStart.plusDays(2) + "&to="
                + leaveStart.plusDays(10));
        assertThat(strings(cut, "$.items[?(@.employee.fullName == 'Phan Khánh Duy')].approvedLeave[*].from"))
                .containsExactly(leaveStart.plusDays(2).toString());
        assertThat(strings(cut, "$.items[?(@.employee.fullName == 'Phan Khánh Duy')].approvedLeave[*].to"))
                .containsExactly(leaveStart.plusDays(4).toString());
    }

    @Test
    void onlyDirectoryDataIsExposed() {
        MvcTestResult found = search(lanBearer, da031, both());

        Map<String, Object> employee = JsonPath.read(body(found), "$.items[0].employee");
        assertThat(employee.keySet()).containsExactlyInAnyOrder("id", "code", "fullName", "orgUnitName",
                "positionName");
        assertThat(employee.get("orgUnitName")).isEqualTo("Nhóm Web");
        assertThat(employee.get("positionName")).isNotNull();
        // Lan's data scope is her own record, yet she staffs from the whole company.
        assertThat(names(found)).isNotEmpty();
    }

    @Test
    void resultsArePaged() {
        MvcTestResult second = search(lanBearer, da031, both() + "&size=2&page=1");

        assertThat(second).bodyJson().extractingPath("$.total").isEqualTo(6);
        assertThat(second).bodyJson().extractingPath("$.page").isEqualTo(1);
        assertThat(second).bodyJson().extractingPath("$.size").isEqualTo(2);
        assertThat(names(second)).containsExactly("Phan Khánh Duy", "Đoàn Minh Tuấn");
        assertThat(names(search(lanBearer, da031, both() + "&size=2&page=9"))).isEmpty();
    }

    // --- the query ---

    @Test
    void theRangeDefaultsToTodayThroughTheProjectEndAndNeedIsOptional() {
        assertThat(search(lanBearer, da031, both() + "&need=50")).hasStatusOk();
        assertThat(search(lanBearer, da031, both() + "&need=100&from=" + T + "&to=" + T.plusDays(170))).hasStatusOk();
    }

    @Test
    void aRangeStartingBeforeTheProjectDefaultsToTheProjectStart() {
        UUID later = project("DA-040", lan, T.plusDays(10), T.plusDays(100));
        MvcTestResult found = search(lanBearer, later, both());

        // Trí is a member of DA-031, not of DA-040, so he is found here.
        assertThat(found).hasStatusOk();
        assertThat(found).bodyJson().extractingPath("$.total").isEqualTo(7);
        assertThat(names(found)).contains("Cao Minh Trí");
        assertThat(found).bodyJson().extractingPath("$.excludedMembers").isEqualTo(0);
        assertThat(found).bodyJson().extractingPath("$.items[0].months[0].month")
                .isEqualTo(YearMonth.from(T.plusDays(10)).toString());
    }

    @Test
    void badValuesAreFieldErrors() {
        assertError(search(lanBearer, da031, ""), "skills", "required");
        assertError(search(lanBearer, da031, "skills=nonsense"), "skills", "invalid");
        assertError(search(lanBearer, da031, "skills=" + react + ":0"), "skills", "level_out_of_range");
        assertError(search(lanBearer, da031, "skills=" + react + ":6"), "skills", "level_out_of_range");
        assertError(search(lanBearer, da031, "skills=" + react + ":3," + react + ":4"), "skills", "duplicate");
        assertError(search(lanBearer, da031, "skills=" + UUID.randomUUID() + ":3"), "skills", "unknown_skill");
        assertError(search(lanBearer, da031, "skills=" + String.join(",", java.util.stream.Stream.generate(
                () -> UUID.randomUUID() + ":3").limit(6).toList())), "skills", "too_many");
        assertError(search(lanBearer, da031, both() + "&need=0"), "need", "out_of_range");
        assertError(search(lanBearer, da031, both() + "&need=101"), "need", "out_of_range");
        assertError(search(lanBearer, da031, both() + "&sort=name"), "sort", "invalid");
        assertError(search(lanBearer, da031, both() + "&size=0"), "size", "out_of_range");
        assertError(search(lanBearer, da031, both() + "&size=101"), "size", "out_of_range");
        assertError(search(lanBearer, da031, both() + "&page=-1"), "page", "out_of_range");
    }

    @Test
    void aRangeOutsideTheProjectOrReversedIsAFieldError() {
        assertError(search(lanBearer, da031, both() + "&from=" + T.minusDays(60)), "from", "outside_project");
        assertError(search(lanBearer, da031, both() + "&from=" + T.plusDays(171) + "&to=" + T.plusDays(172)), "from",
                "outside_project");
        assertError(search(lanBearer, da031, both() + "&to=" + T.plusDays(171)), "to", "outside_project");
        assertError(search(lanBearer, da031, both() + "&from=" + T.plusDays(20) + "&to=" + T.plusDays(10)), "to",
                "before_start");
        assertThat(strings(search(lanBearer, da031, "need=101&from=" + T.minusDays(60)), "$.errors[*].field"))
                .containsExactly("skills", "need", "from");
    }

    // --- who may ask ---

    @Test
    void onlyThoseWhoMayEditTheProjectCanSearch() {
        assertThat(search(lanBearer, da031, both())).hasStatusOk();
        assertThat(search(baoBearer, da031, both())).hasStatusOk();
        // Another PM, HR (who may view projects) and an Employee are refused, and so is nobody signed in.
        assertForbidden(search(hienBearer, da031, both()));
        assertForbidden(search(maiBearer, da031, both()));
        assertForbidden(search(anBearer, da031, both()));
        assertThat(mvc.get().uri("/api/projects/{id}/candidates?" + both(), da031).exchange()).hasStatus(401);
        assertThat(search(hienBearer, da027, both())).hasStatusOk();
    }

    @Test
    void anUnknownProjectIsNotFound() {
        MvcTestResult missing = search(lanBearer, UUID.randomUUID(), both());

        assertThat(missing).hasStatus(404);
        assertThat(missing).bodyJson().extractingPath("$.code").isEqualTo("project.not_found");
    }

    // --- helpers ---

    String both() {
        return "skills=" + react + ":3," + typescript + ":3";
    }

    MvcTestResult search(String bearer, UUID project, String query) {
        return mvc.get().uri("/api/projects/{id}/candidates?" + query, project)
                .header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    static void assertForbidden(MvcTestResult result) {
        assertThat(result).hasStatus(403);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
    }

    static void assertError(MvcTestResult result, String field, String code) {
        assertThat(result).hasStatus(400);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(strings(result, "$.errors[?(@.field == '" + field + "')].code")).containsExactly(code);
    }

    UUID unit(String code, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, ?, ?, 'TEAM', now(), now())""", id, code, name);
        return id;
    }

    UUID skill(String code, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into catalog_item (id, legal_entity_id, catalog, code, name, search_text, active, created_at,
                    updated_at)
                values (?, (select id from legal_entity), 'SKILL', ?, ?, ?, true, now(), now())""",
                id, code, name, name.toLowerCase(Locale.ROOT) + " " + code.toLowerCase(Locale.ROOT));
        return id;
    }

    UUID projectRole() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into catalog_item (id, legal_entity_id, catalog, code, name, search_text, active, created_at,
                    updated_at)
                values (?, (select id from legal_entity), 'PROJECT_ROLE', 'ZRCAND', 'Lập trình viên (test)',
                    'lap trinh vien zrcand', true, now(), now())""", id);
        return id;
    }

    /** React at the first level and TypeScript at the second. */
    void skills(UUID employee, int reactLevel, int typescriptLevel) {
        skill(employee, react, reactLevel);
        skill(employee, typescript, typescriptLevel);
    }

    void skill(UUID employee, UUID skill, int level) {
        jdbc.update("""
                insert into employee_skill (id, legal_entity_id, employee_id, skill_id, level, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, ?, now(), now())""", UUID.randomUUID(), employee,
                skill, level);
    }

    UUID project(String code, UUID pm, LocalDate from, LocalDate to) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into project (id, legal_entity_id, code, name, client, search_text, pm_employee_id, org_unit_id,
                    start_date, end_date, status, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, null, ?, ?, ?, ?, ?, 'ACTIVE', now(), now())""",
                id, code, "Dự án " + code, code.toLowerCase(Locale.ROOT), pm, web, from, to);
        return id;
    }

    void allocate(UUID project, UUID employee, int percent, LocalDate from, LocalDate to) {
        jdbc.update("""
                insert into project_allocation (id, legal_entity_id, project_id, employee_id, project_role_id, percent,
                    start_date, end_date, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, ?, ?, ?, ?, now(), now())""", UUID.randomUUID(),
                project, employee, role, percent, from, to);
    }

    LocalDate nextMonday(int minDaysAhead) {
        LocalDate day = T.plusDays(minDaysAhead);
        while (day.getDayOfWeek() != DayOfWeek.MONDAY) {
            day = day.plusDays(1);
        }
        return day;
    }

    String submitLeave(String bearer, LocalDate start, LocalDate end) {
        String annual = jdbc.queryForObject("select id::text from leave_type where code = 'PN'", String.class);
        MvcTestResult sent = mvc.post().uri("/api/leave-requests").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"leaveTypeId": "%s", "startDate": "%s", "startPart": "FULL", "endDate": "%s",
                         "endPart": "FULL", "reason": null, "cc":[], "attachmentIds":[]}"""
                        .formatted(annual, start, end))
                .exchange();
        assertThat(sent).hasStatus(201);
        return JsonPath.read(body(sent), "$.id");
    }

    String signedIn(UUID employee, Role role) {
        TestAccount account = testAccounts.create(role);
        testEmployees.link(account.id(), employee);
        return testAccounts.bearer(mvc, account);
    }

    static List<String> names(MvcTestResult result) {
        return strings(result, "$.items[*].employee.fullName");
    }

    static List<Integer> ints(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }

    static List<String> strings(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        } catch (UnsupportedEncodingException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
