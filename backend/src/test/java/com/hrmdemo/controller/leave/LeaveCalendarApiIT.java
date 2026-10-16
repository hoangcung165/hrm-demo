package com.hrmdemo.controller.leave;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
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
 * Lịch nghỉ phép against real PostgreSQL. Nhóm Web: Lê Văn Hùng (head) and Nguyễn Văn An; Nhóm Mobile: Cao Minh Trí,
 * headed by Trần Thị Mai (HR). An's request waits in Hùng's inbox, Trí's is approved by Mai. The calendar shows each
 * person what their data scope covers.
 */
@IntegrationTest
class LeaveCalendarApiIT {

    static final ZoneId COMPANY = ZoneId.of("Asia/Ho_Chi_Minh");
    static final String TEST_HOLIDAY = "Ngày kiểm thử lịch nghỉ";

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    LocalDate today;
    UUID web;
    UUID mobile;
    UUID an;
    UUID tri;
    String anBearer;
    String hungBearer;
    String triBearer;
    String maiBearer;
    String annual;
    LocalDate monday;
    LocalDate wednesday;
    LocalDate thursday;
    String anRequest;
    String triRequest;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        web = unit("WEB", "Nhóm Web");
        mobile = unit("MOB", "Nhóm Mobile");
        today = LocalDate.now(COMPANY);
        UUID hung = testEmployees.create("Lê Văn Hùng", web);
        an = testEmployees.create("Nguyễn Văn An", web);
        tri = testEmployees.create("Cao Minh Trí", mobile);
        UUID mai = testEmployees.create("Trần Thị Mai", null);
        testEmployees.makeHead(web, hung);
        testEmployees.makeHead(mobile, mai);
        jdbc.update("update employee set hire_date = ? where id in (?, ?)", LocalDate.of(today.getYear(), 1, 1), an,
                tri);
        anBearer = signedIn(an, Role.EMPLOYEE);
        hungBearer = signedIn(hung, Role.LINE_MANAGER);
        triBearer = signedIn(tri, Role.EMPLOYEE);
        maiBearer = signedIn(mai, Role.HR);
        annual = jdbc.queryForObject("select id::text from leave_type where code = 'PN'", String.class);

        // An: Monday to Friday of a week whose Wednesday is a holiday. Trí: one Thursday, approved.
        monday = workingDay(7, DayOfWeek.MONDAY);
        wednesday = monday.plusDays(2);
        thursday = workingDay(7, DayOfWeek.THURSDAY);
        jdbc.update("""
                insert into catalog_item (id, legal_entity_id, catalog, name, search_text, active, start_date,
                    end_date, created_at, updated_at)
                values (?, (select id from legal_entity), 'HOLIDAY', ?, 'ngay kiem thu lich nghi', true, ?, ?, now(),
                    now())""", UUID.randomUUID(), TEST_HOLIDAY, wednesday, wednesday);
        anRequest = submit(anBearer, request(monday, monday.plusDays(4)));
        triRequest = submit(triBearer, request(thursday, thursday));
        assertThat(decide(maiBearer, triRequest)).hasStatusOk();
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("delete from catalog_item where name = ?", TEST_HOLIDAY);
        jdbc.update("delete from catalog_item where catalog = 'PROJECT_ROLE' and code = 'ZRCAL'");
        jdbc.update("delete from org_unit");
    }

    @Test
    void thePeopleOffAreShownByDayWithApprovedAndWaitingToldApart() {
        MvcTestResult calendar = calendar(maiBearer, "");

        assertThat(calendar).hasStatusOk();
        assertThat(strings(calendar, "$.entries[*].employee.fullName")).containsExactlyInAnyOrder("Nguyễn Văn An",
                "Cao Minh Trí");
        assertThat(strings(calendar, "$.entries[?(@.employee.fullName == 'Nguyễn Văn An')].status"))
                .containsExactly("PENDING");
        assertThat(strings(calendar, "$.entries[?(@.employee.fullName == 'Cao Minh Trí')].status"))
                .containsExactly("APPROVED");
        // The days a request counts: the holiday Wednesday is not one of An's, and neither is a weekend.
        List<String> anDays = strings(calendar,
                "$.entries[?(@.employee.fullName == 'Nguyễn Văn An')].days[*].date");
        assertThat(anDays).contains(monday.toString()).doesNotContain(wednesday.toString());
        assertThat(anDays).allSatisfy(day -> assertThat(LocalDate.parse(day).getDayOfWeek())
                .isNotIn(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY));
        assertThat(strings(calendar, "$.entries[?(@.employee.fullName == 'Cao Minh Trí')].days[*].date"))
                .containsExactly(thursday.toString());
        assertThat(strings(calendar, "$.holidays[*].name")).contains(TEST_HOLIDAY);
    }

    @Test
    void onlyTheDaysInTheRangeAreReturned() {
        MvcTestResult calendar = mvc.get()
                .uri("/api/leave-calendar?from={f}&to={t}", monday.plusDays(3), monday.plusDays(4))
                .header(HttpHeaders.AUTHORIZATION, maiBearer).exchange();

        assertThat(strings(calendar, "$.entries[?(@.employee.fullName == 'Nguyễn Văn An')].days[*].date"))
                .containsExactly(monday.plusDays(3).toString(), monday.plusDays(4).toString());
    }

    @Test
    void aCancelledRequestIsNotOnTheCalendar() {
        assertThat(post(anBearer, "/api/leave-requests/" + anRequest + "/cancel")).hasStatusOk();

        assertThat(strings(calendar(maiBearer, ""), "$.entries[*].employee.fullName")).containsExactly("Cao Minh Trí");
    }

    @Test
    void everyoneSeesWhatTheirDataScopeCovers() {
        // A head sees their unit, an Employee only themselves, HR the company.
        assertThat(strings(calendar(hungBearer, ""), "$.entries[*].employee.fullName")).containsExactly("Nguyễn Văn An");
        assertThat(strings(calendar(anBearer, ""), "$.entries[*].employee.fullName")).containsExactly("Nguyễn Văn An");
        assertThat(strings(calendar(triBearer, ""), "$.entries[*].employee.fullName")).containsExactly("Cao Minh Trí");
    }

    @Test
    void aUnitNarrowsItAndAnUnknownOneIsNotFound() {
        assertThat(strings(calendar(maiBearer, "&orgUnitId=" + mobile), "$.entries[*].employee.fullName"))
                .containsExactly("Cao Minh Trí");
        assertThat(strings(calendar(maiBearer, "&orgUnitId=" + web), "$.entries[*].employee.fullName"))
                .containsExactly("Nguyễn Văn An");

        MvcTestResult unknown = calendar(maiBearer, "&orgUnitId=" + UUID.randomUUID());
        assertThat(unknown).hasStatus(404);
        assertThat(unknown).bodyJson().extractingPath("$.code").isEqualTo("org_unit.not_found");
    }

    @Test
    void aProjectKeepsThePeopleAllocatedToItDuringTheirLeave() {
        UUID role = UUID.randomUUID();
        jdbc.update("""
                insert into catalog_item (id, legal_entity_id, catalog, code, name, search_text, active, created_at,
                    updated_at)
                values (?, (select id from legal_entity), 'PROJECT_ROLE', 'ZRCAL', 'Vai trò lịch nghỉ', 'zrcal', true,
                    now(), now())""", role);
        UUID project = project("ZP-CAL-1", "Dự án lịch nghỉ", tri);
        UUID elsewhere = project("ZP-CAL-2", "Dự án khác", tri);
        // An works on the first project during his leave; Trí's allocation there ended before his.
        allocate(project, an, role, monday.minusDays(10), monday.plusDays(30));
        allocate(project, tri, role, thursday.minusDays(60), thursday.minusDays(30));
        allocate(elsewhere, tri, role, thursday.minusDays(5), thursday.plusDays(5));

        assertThat(strings(calendar(maiBearer, "&projectId=" + project), "$.entries[*].employee.fullName"))
                .containsExactly("Nguyễn Văn An");
        assertThat(strings(calendar(maiBearer, "&projectId=" + elsewhere), "$.entries[*].employee.fullName"))
                .containsExactly("Cao Minh Trí");
        MvcTestResult unknown = calendar(maiBearer, "&projectId=" + UUID.randomUUID());
        assertThat(unknown).hasStatus(404);
        assertThat(unknown).bodyJson().extractingPath("$.code").isEqualTo("project.not_found");
    }

    @Test
    void theRangeIsRequiredInOrderAndAtMostSixtyTwoDays() {
        assertThat(strings(refused("/api/leave-calendar?to=" + today), "$.errors[*].field")).containsExactly("from");
        assertThat(strings(refused("/api/leave-calendar?from=" + today), "$.errors[*].field")).containsExactly("to");
        assertThat(strings(refused("/api/leave-calendar?from=" + today + "&to=" + today.minusDays(1)),
                "$.errors[*].code")).containsExactly("before_from");
        assertThat(strings(refused("/api/leave-calendar?from=" + today + "&to=" + today.plusDays(62)),
                "$.errors[*].code")).containsExactly("range_too_long");
        assertThat(mvc.get().uri("/api/leave-calendar?from={f}&to={t}", today, today.plusDays(61))
                .header(HttpHeaders.AUTHORIZATION, maiBearer).exchange()).hasStatusOk();
    }

    // ------------------------------------------------------------------------------------------------- helpers

    MvcTestResult calendar(String bearer, String extra) {
        return mvc.get().uri("/api/leave-calendar?from=" + today + "&to=" + today.plusDays(61) + extra)
                .header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult refused(String uri) {
        MvcTestResult result = mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, maiBearer).exchange();
        assertThat(result).hasStatus(400);
        return result;
    }

    UUID unit(String code, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, ?, ?, 'TEAM', now(), now())""", id, code, name);
        return id;
    }

    UUID project(String code, String name, UUID pm) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into project (id, legal_entity_id, code, name, client, search_text, pm_employee_id, org_unit_id,
                    start_date, end_date, status, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, null, ?, ?, ?, ?, ?, 'ACTIVE', now(), now())""",
                id, code, name, code.toLowerCase(), pm, web, today.minusDays(400), today.plusDays(400));
        return id;
    }

    void allocate(UUID project, UUID employee, UUID role, LocalDate from, LocalDate to) {
        jdbc.update("""
                insert into project_allocation (id, legal_entity_id, project_id, employee_id, project_role_id, percent,
                    start_date, end_date, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, ?, 50, ?, ?, now(), now())""", UUID.randomUUID(),
                project, employee, role, from, to);
    }

    /** The first day at least {@code minDaysAhead} from today on that weekday that is no holiday. */
    LocalDate workingDay(int minDaysAhead, DayOfWeek weekday) {
        LocalDate day = today.plusDays(minDaysAhead);
        while (day.getDayOfWeek() != weekday || holiday(day)) {
            day = day.plusDays(1);
        }
        return day;
    }

    boolean holiday(LocalDate day) {
        return jdbc.queryForObject("""
                select count(*) from catalog_item where catalog = 'HOLIDAY' and active
                  and start_date <= ? and end_date >= ?""", Long.class, day, day) > 0;
    }

    String request(LocalDate start, LocalDate end) {
        return """
                {"leaveTypeId": "%s", "startDate": "%s", "startPart": "FULL", "endDate": "%s", "endPart": "FULL",
                 "reason": null, "cc":[], "attachmentIds":[]}""".formatted(annual, start, end);
    }

    String submit(String bearer, String json) {
        MvcTestResult sent = mvc.post().uri("/api/leave-requests").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
        assertThat(sent).hasStatus(201);
        return JsonPath.read(body(sent), "$.id");
    }

    MvcTestResult post(String bearer, String uri) {
        return mvc.post().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult decide(String bearer, String id) {
        return mvc.post().uri("/api/approvals/{id}/approve", id).header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content("{}").exchange();
    }

    String signedIn(UUID employee, Role role) {
        TestAccounts.TestAccount account = testAccounts.create(role);
        testEmployees.link(account.id(), employee);
        return testAccounts.bearer(mvc, account);
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    static List<String> strings(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }
}
