package com.hrmdemo.controller.project;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.service.project.ProjectService;
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
 * Dự án API (HRM-15/BE-2) against real PostgreSQL, on the people of the approved #15 artboards: Vũ Thị Lan and
 * Lương Văn Hiển are PMs, Phạm Quốc Bảo is the Giám đốc ("Quản lý mọi dự án"), Trần Thị Mai is HR (view only) and
 * Nguyễn Văn An an Employee (no access).
 */
@IntegrationTest
class ProjectApiIT {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;
    @Autowired
    ProjectService projectService;

    JdbcTemplate jdbc;
    UUID department;
    UUID danang;
    UUID lan;
    UUID hien;
    UUID bao;
    UUID an;
    String lanBearer;
    String hienBearer;
    String baoBearer;
    String maiBearer;
    String anBearer;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        testEmployees.deleteAll();
        jdbc.update("delete from org_unit");
        department = unit("PTPM", "Phòng Phát triển phần mềm", true);
        danang = unit("PMDN", "Phòng Phần mềm Đà Nẵng", true);
        lan = testEmployees.create("Vũ Thị Lan", department);
        hien = testEmployees.create("Lương Văn Hiển", danang);
        bao = testEmployees.create("Phạm Quốc Bảo", null);
        an = testEmployees.create("Nguyễn Văn An", department);
        UUID mai = testEmployees.create("Trần Thị Mai", null);
        lanBearer = signedIn(lan, Role.PROJECT_MANAGER);
        hienBearer = signedIn(hien, Role.PROJECT_MANAGER);
        baoBearer = signedIn(bao, Role.DIRECTOR);
        maiBearer = signedIn(mai, Role.HR);
        anBearer = signedIn(an, Role.EMPLOYEE);
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("delete from org_unit");
    }

    @Test
    void aPmCreatesAProjectOfTheirOwnAndEveryoneWithTheViewReadsIt() {
        MvcTestResult created = post(lanBearer, project("DA-031", "Ứng dụng đặt lịch khám", "Bệnh viện Đa khoa Tâm An",
                lan, department, "2026-09-01", "2027-03-31", "ACTIVE", 2_400_000_000L));

        assertThat(created).hasStatus(201);
        assertThat(created).bodyJson().extractingPath("$.code").isEqualTo("DA-031");
        assertThat(created).bodyJson().extractingPath("$.pm.fullName").isEqualTo("Vũ Thị Lan");
        assertThat(created).bodyJson().extractingPath("$.orgUnit.name").isEqualTo("Phòng Phát triển phần mềm");
        assertThat(created).bodyJson().extractingPath("$.laborBudget").isEqualTo(2_400_000_000L);
        assertThat(created).bodyJson().extractingPath("$.canEdit").isEqualTo(true);
        String id = JsonPath.read(body(created), "$.id");

        MvcTestResult asHr = get(maiBearer, "/api/projects/" + id);
        assertThat(asHr).hasStatusOk();
        assertThat(asHr).bodyJson().extractingPath("$.canEdit").isEqualTo(false);
        assertThat(get(hienBearer, "/api/projects/" + id)).bodyJson().extractingPath("$.canEdit").isEqualTo(false);
        assertThat(get(baoBearer, "/api/projects/" + id)).bodyJson().extractingPath("$.canEdit").isEqualTo(true);
        assertThat(projectService.projectManagerOf(UUID.fromString(id))).contains(lan);
    }

    @Test
    void aPmEditsOnlyTheirOwnProjectsAndCannotHandThemToSomeoneElse() {
        String lans = id(post(lanBearer, project("DA-031", "Ứng dụng đặt lịch khám", null, lan, department,
                "2026-09-01", "2027-03-31", "ACTIVE", null)));
        String hiens = id(post(hienBearer, project("DA-027", "Hệ thống bán hàng tại quầy", "Bán lẻ Lúa Vàng", hien,
                danang, "2026-05-01", "2026-11-30", "ACTIVE", null)));

        assertForbidden(put(lanBearer, hiens, update("Hệ thống bán hàng", null, hien, danang, "2026-05-01",
                "2026-11-30", "ACTIVE", null)), "auth.forbidden");
        assertForbidden(put(lanBearer, lans, update("Ứng dụng đặt lịch khám", null, hien, department, "2026-09-01",
                "2027-03-31", "ACTIVE", null)), "project.pm_not_self");
        assertForbidden(post(lanBearer, project("DA-040", "Dự án của người khác", null, hien, department,
                "2026-10-01", "2026-12-31", "PLANNED", null)), "project.pm_not_self");

        MvcTestResult edited = put(lanBearer, lans, update("  Ứng dụng   đặt lịch khám  ", "Bệnh viện Tâm An", lan,
                department, "2026-09-01", "2026-12-31", "ON_HOLD", 1_000_000L));
        assertThat(edited).hasStatusOk();
        assertThat(edited).bodyJson().extractingPath("$.name").isEqualTo("Ứng dụng đặt lịch khám");
        assertThat(edited).bodyJson().extractingPath("$.status").isEqualTo("ON_HOLD");
        assertThat(edited).bodyJson().extractingPath("$.code").isEqualTo("DA-031");
    }

    @Test
    void quanLyMoiDuAnEditsAnyProjectAndNamesAnyPm() {
        String hiens = id(post(hienBearer, project("DA-027", "Hệ thống bán hàng tại quầy", null, hien, danang,
                "2026-05-01", "2026-11-30", "ACTIVE", null)));

        MvcTestResult handedOver = put(baoBearer, hiens, update("Hệ thống bán hàng tại quầy", null, lan, danang,
                "2026-05-01", "2026-11-30", "ACTIVE", null));
        MvcTestResult forSomeoneElse = post(baoBearer, project("DA-033", "Nền tảng dữ liệu nội bộ", null, hien,
                department, "2026-11-01", "2027-04-30", "PLANNED", null));

        assertThat(handedOver).hasStatusOk();
        assertThat(handedOver).bodyJson().extractingPath("$.pm.fullName").isEqualTo("Vũ Thị Lan");
        assertThat(forSomeoneElse).hasStatus(201);
        // The new PM can now edit it; the old one no longer can.
        assertThat(get(lanBearer, "/api/projects/" + hiens)).bodyJson().extractingPath("$.canEdit").isEqualTo(true);
        assertThat(get(hienBearer, "/api/projects/" + hiens)).bodyJson().extractingPath("$.canEdit")
                .isEqualTo(false);
    }

    @Test
    void withoutTheViewNothingIsReadAndWithoutTheEditNothingIsChanged() {
        String id = id(post(lanBearer, project("DA-031", "Ứng dụng đặt lịch khám", null, lan, department,
                "2026-09-01", "2027-03-31", "ACTIVE", null)));

        assertForbidden(get(anBearer, "/api/projects"), "auth.forbidden");
        assertForbidden(get(anBearer, "/api/projects/" + id), "auth.forbidden");
        assertForbidden(post(maiBearer, project("DA-050", "Dự án HR", null, lan, department, "2026-10-01",
                "2026-12-31", "PLANNED", null)), "auth.forbidden");
        assertForbidden(put(maiBearer, id, update("Đổi tên", null, lan, department, "2026-09-01", "2027-03-31",
                "ACTIVE", null)), "auth.forbidden");
        assertThat(mvc.get().uri("/api/projects").exchange()).hasStatus(401);
        assertThat(get(maiBearer, "/api/projects/" + UUID.randomUUID())).hasStatus(404);
    }

    @Test
    void everyFailingFieldIsReportedAtOnceAndTheReferencesAndTheCodeHaveTheirOwnCodes() {
        MvcTestResult empty = post(lanBearer, "{}");
        assertThat(empty).hasStatus(400);
        assertThat(errorFields(empty)).containsExactly("code", "name", "pmEmployeeId", "orgUnitId", "startDate",
                "endDate", "status");

        MvcTestResult bad = post(lanBearer, project("DA 031", "Ứng dụng", null, lan, department, "2026-09-01",
                "2026-08-31", "RUNNING", -1L));
        assertThat(errorFields(bad)).containsExactly("code", "endDate", "status", "laborBudget");
        assertThat(JsonPath.<List<String>>read(body(bad), "$.errors[*].code"))
                .containsExactly("invalid", "before_start", "invalid", "out_of_range");

        post(lanBearer, project("DA-031", "Ứng dụng đặt lịch khám", null, lan, department, "2026-09-01",
                "2027-03-31", "ACTIVE", null));
        MvcTestResult taken = post(baoBearer, project("da-031", "Trùng mã", null, hien, danang, "2026-09-01",
                "2027-03-31", "ACTIVE", null));
        assertThat(taken).hasStatus(409);
        assertThat(taken).bodyJson().extractingPath("$.code").isEqualTo("project.code_taken");

        assertThat(post(baoBearer, project("DA-041", "PM không có", null, UUID.randomUUID(), department,
                "2026-09-01", "2027-03-31", "ACTIVE", null))).bodyJson().extractingPath("$.code")
                .isEqualTo("project.pm_not_found");
        UUID left = testEmployees.create("Người đã nghỉ", department, "INACTIVE");
        assertThat(post(baoBearer, project("DA-042", "PM đã nghỉ", null, left, department, "2026-09-01",
                "2027-03-31", "ACTIVE", null))).bodyJson().extractingPath("$.code").isEqualTo("project.pm_not_found");
        assertThat(post(baoBearer, project("DA-043", "Đơn vị không có", null, bao, UUID.randomUUID(), "2026-09-01",
                "2027-03-31", "ACTIVE", null))).bodyJson().extractingPath("$.code")
                .isEqualTo("project.org_unit_not_found");
        UUID closedUnit = unit("CU", "Đơn vị đã ngừng", false);
        assertThat(post(baoBearer, project("DA-044", "Đơn vị ngừng", null, bao, closedUnit, "2026-09-01",
                "2027-03-31", "ACTIVE", null))).bodyJson().extractingPath("$.code")
                .isEqualTo("project.org_unit_inactive");
    }

    @Test
    void theListFiltersBySearchTabStatusAndUnitAndHidesClosedProjectsByDefault() {
        post(lanBearer, project("DA-031", "Ứng dụng đặt lịch khám", "Bệnh viện Đa khoa Tâm An", lan, department,
                "2026-09-01", "2027-03-31", "ACTIVE", null));
        post(lanBearer, project("DA-029", "Cổng khách hàng bảo hiểm", "Bảo hiểm Hướng Dương", lan, department,
                "2026-06-15", "2026-12-15", "ACTIVE", null));
        post(hienBearer, project("DA-027", "Hệ thống bán hàng tại quầy", "Bán lẻ Lúa Vàng", hien, danang,
                "2026-05-01", "2026-11-30", "ACTIVE", null));
        post(hienBearer, project("DA-018", "Ứng dụng hội viên", "Bán lẻ Lúa Vàng", hien, danang, "2025-08-01",
                "2026-06-30", "CLOSED", null));

        MvcTestResult all = get(maiBearer, "/api/projects");
        assertThat(all).bodyJson().extractingPath("$.total").isEqualTo(3);
        // Newest start first.
        assertThat(codes(all)).containsExactly("DA-031", "DA-029", "DA-027");
        assertThat(all).bodyJson().extractingPath("$.items[0].pm.fullName").isEqualTo("Vũ Thị Lan");
        assertThat(all).bodyJson().extractingPath("$.items[0].canEdit").isEqualTo(false);

        assertThat(codes(get(lanBearer, "/api/projects?mine=true"))).containsExactly("DA-031", "DA-029");
        assertThat(codes(get(maiBearer, "/api/projects?mine=true"))).isEmpty();
        assertThat(codes(get(maiBearer, "/api/projects?q=lua vang"))).containsExactly("DA-027");
        assertThat(codes(get(maiBearer, "/api/projects?q=LUA&status=ACTIVE,CLOSED")))
                .containsExactly("DA-027", "DA-018");
        assertThat(codes(get(maiBearer, "/api/projects?status=CLOSED"))).containsExactly("DA-018");
        assertThat(codes(get(maiBearer, "/api/projects?orgUnitId=" + danang))).containsExactly("DA-027");
        assertThat(codes(get(maiBearer, "/api/projects?q=da-0&size=2&page=1"))).containsExactly("DA-027");
        assertThat(get(maiBearer, "/api/projects?status=RUNNING")).hasStatus(400);
        assertThat(get(maiBearer, "/api/projects?size=101")).hasStatus(400);
    }

    @Test
    void anEditKeepsAPmWhoHasSinceLeftAndAUnitSinceDeactivated() {
        UUID willLeave = testEmployees.create("Hoàng Gia Huy", department);
        String id = id(post(baoBearer, project("DA-033", "Nền tảng dữ liệu nội bộ", null, willLeave, department,
                "2026-11-01", "2027-04-30", "PLANNED", null)));
        jdbc.update("update employee set status = 'INACTIVE' where id = ?", willLeave);
        jdbc.update("update org_unit set active = false where id = ?", department);

        MvcTestResult renamed = put(baoBearer, id, update("Nền tảng dữ liệu", null, willLeave, department,
                "2026-11-01", "2027-04-30", "PLANNED", null));

        assertThat(renamed).hasStatusOk();
        assertThat(projectService.projectManagerOf(UUID.fromString(id))).contains(willLeave);
    }

    // --- helpers ---

    static String project(String code, String name, String client, UUID pm, UUID unit, String from, String to,
            String status, Long budget) {
        return """
                {"code":"%s","name":"%s","client":%s,"pmEmployeeId":"%s","orgUnitId":"%s","startDate":"%s",
                 "endDate":"%s","status":"%s","laborBudget":%s}"""
                .formatted(code, name, client == null ? "null" : "\"" + client + "\"", pm, unit, from, to, status,
                        budget);
    }

    static String update(String name, String client, UUID pm, UUID unit, String from, String to, String status,
            Long budget) {
        return """
                {"name":"%s","client":%s,"pmEmployeeId":"%s","orgUnitId":"%s","startDate":"%s","endDate":"%s",
                 "status":"%s","laborBudget":%s}"""
                .formatted(name, client == null ? "null" : "\"" + client + "\"", pm, unit, from, to, status, budget);
    }

    UUID unit(String code, String name, boolean active) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, active, created_at, updated_at)
                values (?, (select id from legal_entity), null, ?, ?, 'DEPARTMENT', ?, now(), now())""",
                id, code, name, active);
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

    MvcTestResult post(String bearer, String body) {
        return mvc.post().uri("/api/projects").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
    }

    MvcTestResult put(String bearer, String id, String body) {
        return mvc.put().uri("/api/projects/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
    }

    static void assertForbidden(MvcTestResult result, String code) {
        assertThat(result).hasStatus(403);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo(code);
    }

    static List<String> codes(MvcTestResult result) {
        assertThat(result).hasStatusOk();
        return JsonPath.read(body(result), "$.items[*].code");
    }

    static List<String> errorFields(MvcTestResult result) {
        return JsonPath.read(body(result), "$.errors[*].field");
    }

    static String id(MvcTestResult result) {
        assertThat(result).hasStatus(201);
        return JsonPath.read(body(result), "$.id");
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString();
        } catch (java.io.UnsupportedEncodingException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
