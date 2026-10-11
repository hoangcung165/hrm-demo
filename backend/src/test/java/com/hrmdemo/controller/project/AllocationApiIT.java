package com.hrmdemo.controller.project;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.UnsupportedEncodingException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
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
 * Phân bổ API (HRM-15/BE-3) against real PostgreSQL, on the people of the approved #15 artboards. Dates are relative
 * to today, so the running, upcoming and ended cases hold whenever the test runs. Cao Minh Trí is 60% on DA-029 until
 * {@code T+21}; giving him 60% on DA-031 from {@code T+4} makes him 120% from {@code T+4} to {@code T+21}.
 */
@IntegrationTest
class AllocationApiIT {

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
    UUID hien;
    UUID tri;
    UUID duy;
    UUID dev;
    UUID qa;
    String lanBearer;
    String hienBearer;
    String maiBearer;
    String baoBearer;
    String da031;
    String da029;
    String da027;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        testEmployees.deleteAll();
        jdbc.update("delete from catalog_item where catalog = 'PROJECT_ROLE' and code like 'ZR%'");
        jdbc.update("delete from org_unit");
        department = unit("PTPM", "Phòng Phát triển phần mềm");
        lan = testEmployees.create("Vũ Thị Lan", department);
        hien = testEmployees.create("Lương Văn Hiển", department);
        tri = testEmployees.create("Cao Minh Trí", department);
        duy = testEmployees.create("Phan Khánh Duy", department);
        UUID mai = testEmployees.create("Trần Thị Mai", null);
        UUID bao = testEmployees.create("Phạm Quốc Bảo", null);
        dev = role("ZRDEV", "Lập trình viên (test)", true);
        qa = role("ZRQA", "Kiểm thử viên (test)", true);
        lanBearer = signedIn(lan, Role.PROJECT_MANAGER);
        hienBearer = signedIn(hien, Role.PROJECT_MANAGER);
        maiBearer = signedIn(mai, Role.HR);
        baoBearer = signedIn(bao, Role.DIRECTOR);
        da031 = project(lanBearer, "DA-031", "Ứng dụng đặt lịch khám", lan, T.minusDays(40), T.plusDays(170));
        da029 = project(lanBearer, "DA-029", "Cổng khách hàng bảo hiểm", lan, T.minusDays(120), T.plusDays(60));
        da027 = project(hienBearer, "DA-027", "Hệ thống bán hàng tại quầy", hien, T.minusDays(160), T.plusDays(50));
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("delete from catalog_item where catalog = 'PROJECT_ROLE' and code like 'ZR%'");
        jdbc.update("delete from org_unit");
    }

    @Test
    void anAllocationThatPushesSomeoneAbove100PercentIsSavedWithAWarningNamingThePeriodAndTheProjects() {
        assertThat(allocate(lanBearer, da029, tri, 60, T.minusDays(100), T.plusDays(21))).hasStatus(201);

        MvcTestResult tried = tryIt(lanBearer, da031, null, tri, 60, T.plusDays(4), T.plusDays(80));
        assertThat(tried).hasStatusOk();
        assertThat(tried).bodyJson().extractingPath("$.overloaded").isEqualTo(true);
        assertThat(tried).bodyJson().extractingPath("$.peak").isEqualTo(120);
        assertThat(tried).bodyJson().extractingPath("$.employee.fullName").isEqualTo("Cao Minh Trí");
        assertThat(tried).bodyJson().extractingPath("$.overloadedPeriods[0].from").isEqualTo(T.plusDays(4).toString());
        assertThat(tried).bodyJson().extractingPath("$.overloadedPeriods[0].to").isEqualTo(T.plusDays(21).toString());
        assertThat(strings(tried, "$.overloadedPeriods[0].parts[*].projectCode")).containsExactly("DA-029",
                "DA-031");
        assertThat(strings(tried, "$.overloadedPeriods[0].parts[?(@.thisProject == true)].projectName"))
                .containsExactly("Ứng dụng đặt lịch khám");
        assertThat(tried).bodyJson().extractingPath("$.suggestedMaxPercent").isEqualTo(40);
        assertThat(tried).bodyJson().extractingPath("$.suggestedStart").isEqualTo(T.plusDays(22).toString());
        // Nothing was saved by trying.
        assertThat(list(lanBearer, da031, false)).bodyJson().extractingPath("$.currentCount").isEqualTo(0);

        MvcTestResult saved = allocate(lanBearer, da031, tri, 60, T.plusDays(4), T.plusDays(80));
        assertThat(saved).hasStatus(201);
        assertThat(saved).bodyJson().extractingPath("$.check.overloaded").isEqualTo(true);
        assertThat(saved).bodyJson().extractingPath("$.allocation.status").isEqualTo("UPCOMING");
        assertThat(saved).bodyJson().extractingPath("$.allocation.peakLoad").isEqualTo(120);
        assertThat(saved).bodyJson().extractingPath("$.allocation.projectRole.name")
                .isEqualTo("Lập trình viên (test)");

        // Both projects now show the overload, and the list filter finds them.
        assertThat(project(maiBearer, da031)).bodyJson().extractingPath("$.members.overloaded").isEqualTo(1);
        assertThat(project(maiBearer, da029)).bodyJson().extractingPath("$.members.overloaded").isEqualTo(1);
        assertThat(project(maiBearer, da027)).bodyJson().extractingPath("$.members.overloaded").isEqualTo(0);
        assertThat(strings(get(maiBearer, "/api/projects?overloaded=true"), "$.items[*].code"))
                .containsExactlyInAnyOrder("DA-031", "DA-029");
    }

    @Test
    void onePersonOnSeveralProjectsWithDifferentRangesIsSummedOnlyWhereTheyOverlap() {
        allocate(hienBearer, da027, duy, 30, T.minusDays(150), T.plusDays(50));
        allocate(lanBearer, da029, duy, 20, T.plusDays(30), T.plusDays(60));

        MvcTestResult tried = tryIt(lanBearer, da031, null, duy, 50, T.plusDays(5), T.plusDays(169));

        assertThat(tried).bodyJson().extractingPath("$.overloaded").isEqualTo(false);
        assertThat(tried).bodyJson().extractingPath("$.peak").isEqualTo(100);
        assertThat(tried).bodyJson().extractingPath("$.suggestedMaxPercent").isNull();
        List<String> froms = JsonPath.read(body(tried), "$.periods[*].from");
        List<Integer> all = JsonPath.read(body(tried), "$.periods[*].totalPercent");
        List<Integer> totals = new java.util.ArrayList<>();
        for (int i = 0; i < froms.size(); i++) {
            if (!LocalDate.parse(froms.get(i)).isBefore(T.plusDays(5))) {
                totals.add(all.get(i));
            }
        }
        // 30+50 until DA-029 starts, 30+20+50 while all three run, 50+20 after DA-027 ends, then 50 alone.
        assertThat(totals).containsExactly(80, 100, 70, 50);
    }

    @Test
    void editingReplacesTheAllocationInTheCheckAndMovingItPastTheOverlapClearsTheWarning() {
        allocate(lanBearer, da029, tri, 60, T.minusDays(100), T.plusDays(21));
        String id = JsonPath.read(body(allocate(lanBearer, da031, tri, 60, T.plusDays(4), T.plusDays(80))),
                "$.allocation.id");

        MvcTestResult lowered = tryIt(lanBearer, da031, id, null, 40, T.plusDays(4), T.plusDays(80));
        assertThat(lowered).bodyJson().extractingPath("$.overloaded").isEqualTo(false);
        assertThat(lowered).bodyJson().extractingPath("$.peak").isEqualTo(100);

        MvcTestResult moved = put(lanBearer, da031, id, """
                {"projectRoleId":"%s","percent":60,"startDate":"%s","endDate":"%s"}"""
                .formatted(qa, T.plusDays(22), T.plusDays(80)));
        assertThat(moved).hasStatusOk();
        assertThat(moved).bodyJson().extractingPath("$.check.overloaded").isEqualTo(false);
        assertThat(moved).bodyJson().extractingPath("$.allocation.projectRole.name").isEqualTo("Kiểm thử viên (test)");
        assertThat(project(maiBearer, da031)).bodyJson().extractingPath("$.members.overloaded").isEqualTo(0);
    }

    @Test
    void aPmCannotChangeTheAllocationsOfAnotherPmsProjectAndHrOnlyReadsThem() {
        String id = JsonPath.read(body(allocate(hienBearer, da027, duy, 30, T.minusDays(10), T.plusDays(40))),
                "$.allocation.id");

        assertForbidden(allocate(lanBearer, da027, tri, 50, T, T.plusDays(10)));
        assertForbidden(tryIt(lanBearer, da027, null, tri, 50, T, T.plusDays(10)));
        assertForbidden(post(lanBearer, "/api/projects/" + da027 + "/allocations/" + id + "/end",
                "{\"endDate\":\"" + T.plusDays(1) + "\"}"));
        assertForbidden(mvc.delete().uri("/api/projects/{p}/allocations/{id}", da027, id)
                .header(HttpHeaders.AUTHORIZATION, lanBearer).exchange());
        assertForbidden(get(lanBearer, "/api/projects/" + da027 + "/allocation-candidates"));
        assertForbidden(allocate(maiBearer, da027, tri, 50, T, T.plusDays(10)));

        // HR and the other PM read them; the Giám đốc manages every project.
        assertThat(list(maiBearer, da027, false)).bodyJson().extractingPath("$.items[0].employee.fullName")
                .isEqualTo("Phan Khánh Duy");
        assertThat(list(lanBearer, da027, false)).hasStatusOk();
        assertThat(allocate(baoBearer, da027, tri, 50, T, T.plusDays(10))).hasStatus(201);
    }

    @Test
    void theFieldsAndTheRulesHaveTheirOwnCodes() {
        MvcTestResult empty = post(lanBearer, "/api/projects/" + da031 + "/allocations", "{}");
        assertThat(empty).hasStatus(400);
        assertThat(strings(empty, "$.errors[*].field")).containsExactly("employeeId", "projectRoleId", "percent",
                "startDate", "endDate");

        MvcTestResult outside = allocate(lanBearer, da031, tri, 101, T.minusDays(41), T.plusDays(171));
        assertThat(strings(outside, "$.errors[*].code")).containsExactly("out_of_range", "outside_project",
                "outside_project");
        MvcTestResult reversed = allocate(lanBearer, da031, tri, 50, T.plusDays(10), T.plusDays(9));
        assertThat(strings(reversed, "$.errors[*].code")).containsExactly("before_start");

        assertCode(allocate(lanBearer, da031, UUID.randomUUID(), 50, T, T.plusDays(9)), 400,
                "allocation.employee_not_found");
        UUID left = testEmployees.create("Người đã nghỉ", department, "INACTIVE");
        assertCode(allocate(lanBearer, da031, left, 50, T, T.plusDays(9)), 400, "allocation.employee_not_found");
        UUID oldRole = role("ZROLD", "Vai trò cũ (test)", false);
        assertCode(post(lanBearer, "/api/projects/" + da031 + "/allocations", body(tri, oldRole, 50, T, T.plusDays(9))),
                409, "allocation.project_role_inactive");
        assertCode(post(lanBearer, "/api/projects/" + da031 + "/allocations",
                body(tri, UUID.randomUUID(), 50, T, T.plusDays(9))), 400, "allocation.project_role_not_found");

        allocate(lanBearer, da031, tri, 50, T, T.plusDays(30));
        MvcTestResult twice = allocate(lanBearer, da031, tri, 20, T.plusDays(30), T.plusDays(60));
        assertCode(twice, 409, "allocation.already_in_project");
        assertThat(twice).bodyJson().extractingPath("$.endDate").isEqualTo(T.plusDays(30).toString());
        // Right after it is fine.
        assertThat(allocate(lanBearer, da031, tri, 20, T.plusDays(31), T.plusDays(60))).hasStatus(201);
        assertCode(put(lanBearer, da031, UUID.randomUUID().toString(), """
                {"projectRoleId":"%s","percent":10,"startDate":"%s","endDate":"%s"}""".formatted(dev, T, T)), 404,
                "allocation.not_found");
    }

    @Test
    void anAllocationIsDeletedOnlyBeforeItStartsAndEndedEarlyAfter() {
        String started = JsonPath.read(body(allocate(lanBearer, da031, tri, 50, T.minusDays(10), T.plusDays(30))),
                "$.allocation.id");
        String upcoming = JsonPath.read(body(allocate(lanBearer, da031, duy, 50, T.plusDays(5), T.plusDays(30))),
                "$.allocation.id");

        assertCode(delete(lanBearer, da031, started), 409, "allocation.started");
        assertThat(delete(lanBearer, da031, upcoming)).hasStatus(204);

        MvcTestResult tooLate = end(lanBearer, da031, started, T.plusDays(30));
        assertThat(strings(tooLate, "$.errors[*].code")).containsExactly("not_earlier");
        MvcTestResult beforeStart = end(lanBearer, da031, started, T.minusDays(11));
        assertThat(strings(beforeStart, "$.errors[*].code")).containsExactly("before_start");

        MvcTestResult ended = end(lanBearer, da031, started, T.minusDays(1));
        assertThat(ended).hasStatusOk();
        assertThat(ended).bodyJson().extractingPath("$.allocation.status").isEqualTo("ENDED");
        MvcTestResult current = list(lanBearer, da031, false);
        assertThat(current).bodyJson().extractingPath("$.currentCount").isEqualTo(0);
        assertThat(current).bodyJson().extractingPath("$.endedCount").isEqualTo(1);
        assertThat(list(lanBearer, da031, true)).bodyJson().extractingPath("$.items[0].endDate")
                .isEqualTo(T.minusDays(1).toString());
    }

    @Test
    void shorteningAProjectCutsItsAllocationsAndClosingEndsTheRunningOnesTodayAndBlocksChanges() {
        allocate(lanBearer, da031, tri, 50, T.minusDays(30), T.plusDays(150));
        allocate(lanBearer, da031, duy, 50, T.plusDays(120), T.plusDays(160));

        MvcTestResult shortened = put(lanBearer, "/api/projects/" + da031, project("Ứng dụng đặt lịch khám", lan,
                T.minusDays(40), T.plusDays(100), "ACTIVE"));
        assertThat(shortened).hasStatusOk();
        MvcTestResult afterCut = list(lanBearer, da031, false);
        assertThat(afterCut).bodyJson().extractingPath("$.currentCount").isEqualTo(1);
        assertThat(afterCut).bodyJson().extractingPath("$.items[0].endDate").isEqualTo(T.plusDays(100).toString());
        allocate(lanBearer, da031, duy, 40, T.plusDays(10), T.plusDays(20));

        MvcTestResult closed = put(lanBearer, "/api/projects/" + da031, project("Ứng dụng đặt lịch khám", lan,
                T.minusDays(40), T.plusDays(100), "CLOSED"));
        assertThat(closed).hasStatusOk();
        assertThat(closed).bodyJson().extractingPath("$.members.running").isEqualTo(1);
        assertThat(closed).bodyJson().extractingPath("$.members.upcoming").isEqualTo(0);
        MvcTestResult afterClose = list(lanBearer, da031, false);
        assertThat(afterClose).bodyJson().extractingPath("$.items[0].endDate").isEqualTo(T.toString());
        assertThat(afterClose).bodyJson().extractingPath("$.currentCount").isEqualTo(1);

        assertCode(allocate(lanBearer, da031, duy, 40, T, T), 409, "project.closed");
    }

    @Test
    void thePickerShowsEachPersonsLoadTodayAndWhetherTheyAreAlreadyInTheProject() {
        allocate(hienBearer, da027, duy, 30, T.minusDays(10), T.plusDays(40));
        allocate(lanBearer, da031, tri, 50, T.plusDays(10), T.plusDays(40));

        MvcTestResult found = get(lanBearer, "/api/projects/" + da031 + "/allocation-candidates?q=Phan Kh");
        assertThat(found).hasStatusOk();
        assertThat(found).bodyJson().extractingPath("$[0].employee.fullName").isEqualTo("Phan Khánh Duy");
        assertThat(found).bodyJson().extractingPath("$[0].loadToday").isEqualTo(30);
        assertThat(found).bodyJson().extractingPath("$[0].inProjectFrom").isNull();

        MvcTestResult inProject = get(lanBearer, "/api/projects/" + da031 + "/allocation-candidates?q=Cao Minh");
        assertThat(inProject).bodyJson().extractingPath("$[0].loadToday").isEqualTo(0);
        assertThat(inProject).bodyJson().extractingPath("$[0].inProjectFrom").isEqualTo(T.plusDays(10).toString());
    }

    // --- helpers ---

    String project(String bearer, String code, String name, UUID pm, LocalDate from, LocalDate to) {
        MvcTestResult created = post(bearer, "/api/projects", """
                {"code":"%s","name":"%s","pmEmployeeId":"%s","orgUnitId":"%s","startDate":"%s","endDate":"%s",
                 "status":"ACTIVE"}""".formatted(code, name, pm, department, from, to));
        assertThat(created).hasStatus(201);
        return JsonPath.read(body(created), "$.id");
    }

    String project(String name, UUID pm, LocalDate from, LocalDate to, String status) {
        return """
                {"name":"%s","pmEmployeeId":"%s","orgUnitId":"%s","startDate":"%s","endDate":"%s","status":"%s"}"""
                .formatted(name, pm, department, from, to, status);
    }

    MvcTestResult project(String bearer, String id) {
        return get(bearer, "/api/projects/" + id);
    }

    MvcTestResult allocate(String bearer, String projectId, UUID employee, int percent, LocalDate from,
            LocalDate to) {
        return post(bearer, "/api/projects/" + projectId + "/allocations", body(employee, dev, percent, from, to));
    }

    static String body(UUID employee, UUID role, int percent, LocalDate from, LocalDate to) {
        return """
                {"employeeId":"%s","projectRoleId":"%s","percent":%d,"startDate":"%s","endDate":"%s"}"""
                .formatted(employee, role, percent, from, to);
    }

    MvcTestResult tryIt(String bearer, String projectId, String allocationId, UUID employee, int percent,
            LocalDate from, LocalDate to) {
        return post(bearer, "/api/projects/" + projectId + "/allocations/try", """
                {"allocationId":%s,"employeeId":%s,"percent":%d,"startDate":"%s","endDate":"%s"}"""
                .formatted(allocationId == null ? "null" : "\"" + allocationId + "\"",
                        employee == null ? "null" : "\"" + employee + "\"", percent, from, to));
    }

    MvcTestResult list(String bearer, String projectId, boolean ended) {
        return get(bearer, "/api/projects/" + projectId + "/allocations?ended=" + ended);
    }

    MvcTestResult end(String bearer, String projectId, String id, LocalDate endDate) {
        return post(bearer, "/api/projects/" + projectId + "/allocations/" + id + "/end",
                "{\"endDate\":\"" + endDate + "\"}");
    }

    MvcTestResult delete(String bearer, String projectId, String id) {
        return mvc.delete().uri("/api/projects/{p}/allocations/{id}", projectId, id)
                .header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    UUID unit(String code, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, ?, ?, 'DEPARTMENT', now(), now())""", id, code, name);
        return id;
    }

    UUID role(String code, String name, boolean active) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into catalog_item (id, legal_entity_id, catalog, code, name, search_text, active, created_at,
                    updated_at)
                values (?, (select id from legal_entity), 'PROJECT_ROLE', ?, ?, ?, ?, now(), now())""",
                id, code, name, name.toLowerCase(Locale.ROOT) + " " + code.toLowerCase(Locale.ROOT), active);
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

    MvcTestResult put(String bearer, String uri, String body) {
        return mvc.put().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).contentType(MediaType.APPLICATION_JSON)
                .content(body).exchange();
    }

    MvcTestResult put(String bearer, String projectId, String id, String body) {
        return put(bearer, "/api/projects/" + projectId + "/allocations/" + id, body);
    }

    static void assertForbidden(MvcTestResult result) {
        assertCode(result, 403, "auth.forbidden");
    }

    static void assertCode(MvcTestResult result, int status, String code) {
        assertThat(result).hasStatus(status);
        if (code != null) {
            assertThat(result).bodyJson().extractingPath("$.code").isEqualTo(code);
        }
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
