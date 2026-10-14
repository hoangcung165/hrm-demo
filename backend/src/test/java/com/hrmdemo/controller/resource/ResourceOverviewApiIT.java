package com.hrmdemo.controller.resource;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.UnsupportedEncodingException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.SearchText;
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
 * Bench, Sắp hết dự án and the Nguồn lực overview (HRM-17/BE-3) against real PostgreSQL, on the people of the
 * approved #17 artboards. Dates are relative to today. Cao Minh Trí is 60% on DA-029 until {@code T+21} and 60% on DA-031 from
 * {@code T+4}: 120% from {@code T+4} to {@code T+21}.
 */
@IntegrationTest
class ResourceOverviewApiIT {

    static final LocalDate T = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    UUID department;
    UUID lan;
    UUID tri;
    UUID duy;
    UUID an;
    UUID mai;
    UUID left;
    UUID dev;
    String lanBearer;
    String maiBearer;
    String anBearer;
    String da031;
    String da029;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        jdbc.update("delete from resource_setting");
        testEmployees.deleteAll();
        jdbc.update("delete from catalog_item where catalog = 'PROJECT_ROLE' and code like 'ZR%'");
        jdbc.update("delete from org_unit");
        department = unit("PTPM", "Phòng Phát triển phần mềm");
        lan = testEmployees.create("Vũ Thị Lan", department);
        tri = testEmployees.create("Cao Minh Trí", department);
        duy = testEmployees.create("Phan Khánh Duy", department);
        an = testEmployees.create("Nguyễn Văn An", null);
        mai = testEmployees.create("Trần Thị Mai", null);
        left = testEmployees.create("Người đã nghỉ", department, "INACTIVE");
        normalizeSearchText();
        dev = role("ZRDEV", "Lập trình viên (test)");
        lanBearer = signedIn(lan, Role.PROJECT_MANAGER);
        maiBearer = signedIn(mai, Role.HR);
        anBearer = signedIn(an, Role.EMPLOYEE);
        da031 = project("DA-031", "Ứng dụng đặt lịch khám", T.minusDays(40), T.plusDays(170));
        da029 = project("DA-029", "Cổng khách hàng bảo hiểm", T.minusDays(120), T.plusDays(60));
        allocate(da029, tri, 60, T.minusDays(100), T.plusDays(21));
        allocate(da031, tri, 60, T.plusDays(4), T.plusDays(80));
        allocate(da029, duy, 30, T.minusDays(10), T.plusDays(40));
        allocate(da029, mai, 50, T.plusDays(30), T.plusDays(60));
    }

    @AfterEach
    void cleanUp() {
        jdbc.update("delete from resource_setting");
        testEmployees.deleteAll();
        jdbc.update("delete from catalog_item where catalog = 'PROJECT_ROLE' and code like 'ZR%'");
        jdbc.update("delete from org_unit");
    }

    @Test
    void benchListsPeopleUnderTheThresholdLowestLoadFirst() {
        MvcTestResult bench = get(lanBearer, "/api/resources/bench");

        assertThat(bench).hasStatusOk();
        assertThat(bench).bodyJson().extractingPath("$.granularity").isEqualTo("WEEK");
        assertThat(bench).bodyJson().extractingPath("$.total").isEqualTo(4);
        // Three people with no allocation this week (by name), then Duy at 30%.
        assertThat(strings(bench, "$.items[*].employee.fullName")).containsExactly("Nguyễn Văn An",
                "Trần Thị Mai", "Vũ Thị Lan", "Phan Khánh Duy");
        assertThat(bench).bodyJson().extractingPath("$.summary.noAllocation").isEqualTo(3);
        assertThat(bench).bodyJson().extractingPath("$.summary.belowThreshold").isEqualTo(1);
        assertThat(bench).bodyJson().extractingPath("$.thresholds.benchPercent").isEqualTo(50);
        // Mai starts on DA-029 in 30 days; Duy is on DA-029 now and has nothing next.
        assertThat(bench).bodyJson().extractingPath("$.items[1].nextAllocation.projectCode").isEqualTo("DA-029");
        assertThat(bench).bodyJson().extractingPath("$.items[1].nextAllocation.startDate")
                .isEqualTo(T.plusDays(30).toString());
        assertThat(bench).bodyJson().extractingPath("$.items[1].latestProject").isNull();
        assertThat(bench).bodyJson().extractingPath("$.items[3].peak").isEqualTo(30);
        assertThat(bench).bodyJson().extractingPath("$.items[3].nextAllocation").isNull();
        assertThat(bench).bodyJson().extractingPath("$.items[3].latestProject.projectCode").isEqualTo("DA-029");
        assertThat(bench).bodyJson().extractingPath("$.items[3].latestProject.endDate")
                .isEqualTo(T.plusDays(40).toString());
    }

    @Test
    void benchFollowsThePeriodAndTheUnitFilterAndPaging() {
        // In 40 days Mai is on 50%, which is not under the threshold; Duy has left DA-029 by T+41.
        MvcTestResult later = get(lanBearer, "/api/resources/bench?from=" + T.plusDays(35));
        assertThat(strings(later, "$.items[*].employee.fullName")).doesNotContain("Trần Thị Mai");

        MvcTestResult unit = get(lanBearer, "/api/resources/bench?orgUnitId=" + department);
        assertThat(strings(unit, "$.items[*].employee.fullName")).containsExactly("Vũ Thị Lan", "Phan Khánh Duy");

        MvcTestResult second = get(lanBearer, "/api/resources/bench?size=3&page=1");
        assertThat(second).bodyJson().extractingPath("$.total").isEqualTo(4);
        assertThat(strings(second, "$.items[*].employee.fullName")).containsExactly("Phan Khánh Duy");

        MvcTestResult month = get(lanBearer, "/api/resources/bench?granularity=MONTH&from=" + T);
        assertThat(month).bodyJson().extractingPath("$.from").isEqualTo(T.withDayOfMonth(1).toString());
    }

    @Test
    void theBenchThresholdInForceDecidesWhoIsOnTheBench() {
        jdbc.update("""
                insert into resource_setting (id, legal_entity_id, bench_percent, near_full_percent, ending_weeks,
                    updated_at) values (?, (select id from legal_entity), 25, 90, 4, now())""", UUID.randomUUID());

        // Duy at 30% is no longer under 25%.
        assertThat(strings(get(lanBearer, "/api/resources/bench"), "$.items[*].employee.fullName"))
                .containsExactly("Nguyễn Văn An", "Trần Thị Mai", "Vũ Thị Lan");
    }

    @Test
    void endingSoonListsAllocationsEndingWithinTheConfiguredWeeks() {
        MvcTestResult ending = get(lanBearer, "/api/resources/ending");

        assertThat(ending).hasStatusOk();
        assertThat(ending).bodyJson().extractingPath("$.weeks").isEqualTo(4);
        assertThat(ending).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(ending).bodyJson().extractingPath("$.items[0].employee.fullName").isEqualTo("Cao Minh Trí");
        assertThat(ending).bodyJson().extractingPath("$.items[0].allocation.projectCode").isEqualTo("DA-029");
        assertThat(ending).bodyJson().extractingPath("$.items[0].allocation.projectRole.name")
                .isEqualTo("Lập trình viên (test)");
        assertThat(ending).bodyJson().extractingPath("$.items[0].daysLeft").isEqualTo(21);
        // DA-031 (60%) goes on after DA-029 ends: not free, nothing "next".
        assertThat(ending).bodyJson().extractingPath("$.items[0].loadAfter").isEqualTo(60);
        assertThat(ending).bodyJson().extractingPath("$.items[0].next").isNull();
        assertThat(ending).bodyJson().extractingPath("$.items[0].withoutNext").isEqualTo(false);
        assertThat(ending).bodyJson().extractingPath("$.summary.withoutNext").isEqualTo(0);
        assertThat(get(lanBearer, "/api/resources/ending?onlyWithoutNext=true")).bodyJson()
                .extractingPath("$.total").isEqualTo(0);
    }

    @Test
    void theEndingSoonWeeksSettingWidensTheListAndTheWithoutNextFilterNarrowsIt() {
        jdbc.update("""
                insert into resource_setting (id, legal_entity_id, bench_percent, near_full_percent, ending_weeks,
                    updated_at) values (?, (select id from legal_entity), 50, 90, 6, now())""", UUID.randomUUID());

        MvcTestResult ending = get(lanBearer, "/api/resources/ending");
        // Trí ends in 21 days, Duy in 40 (within 6 weeks = 42 days).
        assertThat(strings(ending, "$.items[*].employee.fullName")).containsExactly("Cao Minh Trí",
                "Phan Khánh Duy");
        assertThat(ending).bodyJson().extractingPath("$.summary.withoutNext").isEqualTo(1);

        MvcTestResult free = get(lanBearer, "/api/resources/ending?onlyWithoutNext=true");
        assertThat(strings(free, "$.items[*].employee.fullName")).containsExactly("Phan Khánh Duy");
        assertThat(free).bodyJson().extractingPath("$.items[0].loadAfter").isEqualTo(0);
        assertThat(free).bodyJson().extractingPath("$.items[0].withoutNext").isEqualTo(true);
        assertThat(free).bodyJson().extractingPath("$.summary.endingSoon").isEqualTo(2);
    }

    @Test
    void theOverviewCountsPeopleLevelsProjectsAndWhatNeedsALook() {
        MvcTestResult overview = get(lanBearer, "/api/resources/overview");

        assertThat(overview).hasStatusOk();
        LocalDate weekFrom = LocalDate.parse(JsonPath.read(body(overview), "$.weekFrom"));
        assertThat(weekFrom.getDayOfWeek().getValue()).isEqualTo(1);
        assertThat(weekFrom).isBeforeOrEqualTo(T).isAfter(T.minusDays(7));
        assertThat(overview).bodyJson().extractingPath("$.tiles.people").isEqualTo(5);
        assertThat(overview).bodyJson().extractingPath("$.tiles.projectStaff").isEqualTo(2);
        assertThat((Integer) JsonPath.read(body(overview), "$.tiles.projectsRunning")).isGreaterThanOrEqualTo(2);
        // Trí 60% (120% when DA-031 has started this week) and Duy 30%.
        assertThat((Integer) JsonPath.read(body(overview), "$.tiles.averageLoad")).isIn(45, 75);
        assertThat(overview).bodyJson().extractingPath("$.tiles.bench").isEqualTo(4);
        assertThat(overview).bodyJson().extractingPath("$.tiles.overloadedIn12Weeks").isEqualTo(1);
        assertThat(overview).bodyJson().extractingPath("$.tiles.endingSoon").isEqualTo(1);
        assertThat((Integer) JsonPath.read(body(overview), "$.thisWeek.bench")).isEqualTo(4);
        assertThat(overview).bodyJson().extractingPath("$.weeks").asArray().hasSize(12);
        assertThat(overview).bodyJson().extractingPath("$.weeks[0].from").isEqualTo(weekFrom.toString());
        // Every week counts the same five people.
        for (int i = 0; i < 12; i++) {
            int sum = 0;
            for (String level : List.of("bench", "partial", "full", "over")) {
                sum += (Integer) JsonPath.read(body(overview), "$.weeks[" + i + "].levels." + level);
            }
            assertThat(sum).isEqualTo(5);
        }

        assertThat(strings(overview, "$.attention.overloaded[*].employee.fullName")).containsExactly("Cao Minh Trí");
        assertThat(overview).bodyJson().extractingPath("$.attention.overloaded[0].peak").isEqualTo(120);
        assertThat(overview).bodyJson().extractingPath("$.attention.overloaded[0].from")
                .isEqualTo(T.plusDays(4).toString());
        assertThat(overview).bodyJson().extractingPath("$.attention.overloaded[0].to")
                .isEqualTo(T.plusDays(21).toString());
        assertThat(strings(overview, "$.attention.overloaded[0].projects")).containsExactly("DA-029", "DA-031");
        assertThat(overview).bodyJson().extractingPath("$.attention.ending[0].allocation.projectCode")
                .isEqualTo("DA-029");
        assertThat(overview).bodyJson().extractingPath("$.attention.ending[0].loadAfter").isEqualTo(60);
    }

    @Test
    @SuppressWarnings("unchecked")
    void theOverviewStaffsEachRunningProject() {
        MvcTestResult overview = get(lanBearer, "/api/resources/overview");

        // DA-029 this week: Trí 60% and Duy 30%; Mai joins in 30 days.
        String row = "$.projects[?(@.code=='DA-029')]";
        assertThat((List<?>) JsonPath.read(body(overview), row)).hasSize(1);
        assertThat((List<Integer>) JsonPath.read(body(overview), row + ".headcount")).containsExactly(2);
        assertThat((List<Double>) JsonPath.read(body(overview), row + ".fte")).containsExactly(0.9);
        assertThat((List<Integer>) JsonPath.read(body(overview), row + ".upcoming")).containsExactly(1);
    }

    @Test
    void theOverviewFollowsTheWeekAndTheUnitFilter() {
        MvcTestResult unit = get(lanBearer, "/api/resources/overview?orgUnitId=" + department);
        // Lan, Trí and Duy are in the department.
        assertThat(unit).bodyJson().extractingPath("$.tiles.people").isEqualTo(3);

        // Four weeks on, Trí is on DA-031 (60%) only after DA-029 ends at T+21: the week of T+28 has no overload.
        MvcTestResult later = get(lanBearer, "/api/resources/overview?week=" + T.plusDays(28));
        assertThat(later).bodyJson().extractingPath("$.tiles.overloadedNow").isEqualTo(0);
        LocalDate from = LocalDate.parse(JsonPath.read(body(later), "$.weekFrom"));
        assertThat(from).isBeforeOrEqualTo(T.plusDays(28)).isAfter(T.plusDays(21));
    }

    @Test
    void permissionsAndBadRequests() {
        for (String path : List.of("/api/resources/bench", "/api/resources/ending", "/api/resources/overview")) {
            assertThat(get(maiBearer, path)).hasStatusOk();
            assertThat(get(anBearer, path)).hasStatus(403);
            assertThat(mvc.get().uri(path).exchange()).hasStatus(401);
        }
        MvcTestResult invalid = get(lanBearer, "/api/resources/bench?granularity=DAY&page=-1&size=500");
        assertThat(invalid).hasStatus(400);
        assertThat(invalid).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(strings(invalid, "$.errors[*].field")).containsExactly("granularity", "page", "size");
        assertThat(get(lanBearer, "/api/resources/ending?size=0")).hasStatus(400);
    }

    // --- helpers ---

    /** The shared test helper only lower-cases search_text; the real service stores it without accents. */
    void normalizeSearchText() {
        for (Map<String, Object> row : jdbc.queryForList("select id, full_name, code from employee")) {
            jdbc.update("update employee set search_text = ? where id = ?",
                    SearchText.of((String) row.get("full_name"), (String) row.get("code")), row.get("id"));
        }
    }

    String project(String code, String name, LocalDate from, LocalDate to) {
        MvcTestResult created = post(lanBearer, "/api/projects", """
                {"code":"%s","name":"%s","pmEmployeeId":"%s","orgUnitId":"%s","startDate":"%s","endDate":"%s",
                 "status":"ACTIVE"}""".formatted(code, name, lan, department, from, to));
        assertThat(created).hasStatus(201);
        return JsonPath.read(body(created), "$.id");
    }

    void allocate(String projectId, UUID employee, int percent, LocalDate from, LocalDate to) {
        assertThat(post(lanBearer, "/api/projects/" + projectId + "/allocations", """
                {"employeeId":"%s","projectRoleId":"%s","percent":%d,"startDate":"%s","endDate":"%s"}"""
                .formatted(employee, dev, percent, from, to))).hasStatus(201);
    }

    UUID unit(String code, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, ?, ?, 'DEPARTMENT', now(), now())""", id, code, name);
        return id;
    }

    UUID role(String code, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into catalog_item (id, legal_entity_id, catalog, code, name, search_text, active, created_at,
                    updated_at)
                values (?, (select id from legal_entity), 'PROJECT_ROLE', ?, ?, ?, true, now(), now())""",
                id, code, name, name.toLowerCase(Locale.ROOT) + " " + code.toLowerCase(Locale.ROOT));
        return id;
    }

    String signedIn(UUID employee, Role role) {
        TestAccount account = testAccounts.create(role);
        testEmployees.link(account.id(), employee);
        return testAccounts.bearer(mvc, account);
    }

    MvcTestResult get(String bearer, String uri) {
        return mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult post(String bearer, String uri, String body) {
        return mvc.post().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).contentType(MediaType.APPLICATION_JSON)
                .content(body).exchange();
    }

    static List<String> strings(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString();
        } catch (UnsupportedEncodingException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
