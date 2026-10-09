package com.hrmdemo.controller.approval;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.service.approval.ApprovalRequestService;
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
 * The Hộp thư duyệt against real PostgreSQL, on the same small company as {@link ApprovalRequestApiIT}: Phòng Phát triển phần mềm (head Khoa) with Nhóm
 * Web (head Hùng, member An), and two HR people, Mai and Hân, directly under the company. Profile updates use the
 * default flow: Quản lý trực tiếp, then HR.
 */
@IntegrationTest
class ApprovalInboxApiIT {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;
    @Autowired
    ApprovalRequestService requests;

    JdbcTemplate jdbc;
    UUID an;
    UUID hung;
    UUID khoa;
    UUID mai;
    UUID han;
    UUID tri;
    String anBearer;
    String hungBearer;
    String khoaBearer;
    String maiBearer;
    String hanBearer;
    String triBearer;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        testEmployees.deleteAll();
        jdbc.update("delete from approval_flow_setting");
        jdbc.update("delete from org_unit");
        UUID department = unit("PTPM", "Phòng Phát triển phần mềm", null);
        UUID web = unit("WEB", "Nhóm Web", department);
        khoa = testEmployees.create("Nguyễn Văn Khoa", department);
        hung = testEmployees.create("Lê Văn Hùng", web);
        an = testEmployees.create("Nguyễn Văn An", web);
        tri = testEmployees.create("Cao Minh Trí", web);
        mai = testEmployees.create("Trần Thị Mai", null);
        han = testEmployees.create("Trương Thị Ngọc Hân", null);
        testEmployees.makeHead(department, khoa);
        testEmployees.makeHead(web, hung);
        anBearer = signedIn(an, Role.EMPLOYEE);
        hungBearer = signedIn(hung, Role.LINE_MANAGER);
        khoaBearer = signedIn(khoa, Role.LINE_MANAGER);
        maiBearer = signedIn(mai, Role.HR);
        hanBearer = signedIn(han, Role.HR);
        triBearer = signedIn(tri, Role.EMPLOYEE);
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("delete from org_unit");
    }

    @Test
    void eachPersonSeesTheirOwnTabsAndCountsAsTheRequestMovesOn() {
        UUID id = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Số điện thoại, địa chỉ");

        MvcTestResult waiting = list(hungBearer, "WAITING");
        assertThat(waiting).hasStatusOk();
        assertThat(waiting).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(waiting).bodyJson().extractingPath("$.items[0].id").isEqualTo(id.toString());
        assertThat(waiting).bodyJson().extractingPath("$.items[0].sender.fullName").isEqualTo("Nguyễn Văn An");
        assertThat(waiting).bodyJson().extractingPath("$.items[0].sender.orgUnitName").isEqualTo("Nhóm Web");
        assertThat(waiting).bodyJson().extractingPath("$.items[0].summary").isEqualTo("Số điện thoại, địa chỉ");
        assertThat(waiting).bodyJson().extractingPath("$.items[0].rule").isEqualTo("LINE_MANAGER");
        assertThat(waiting).bodyJson().extractingPath("$.items[0].level").isEqualTo(1);
        assertThat(waiting).bodyJson().extractingPath("$.items[0].levelCount").isEqualTo(2);
        assertThat(waiting).bodyJson().extractingPath("$.items[0].autoApproveDueAt").isNotNull();
        assertThat(waiting).bodyJson().extractingPath("$.items[0].resubmitted").isEqualTo(false);
        assertThat(list(maiBearer, "WAITING")).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(list(anBearer, "SENT")).bodyJson().extractingPath("$.items[0].status").isEqualTo("PENDING");
        assertCounts(hungBearer, 1, 0);
        assertCounts(anBearer, 0, 1);

        post(hungBearer, id, "approve", null);

        assertThat(list(hungBearer, "WAITING")).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(list(hungBearer, "HANDLED")).bodyJson().extractingPath("$.total").isEqualTo(1);
        MvcTestResult hr = list(maiBearer, "WAITING");
        assertThat(hr).bodyJson().extractingPath("$.items[0].rule").isEqualTo("ROLE");
        assertThat(hr).bodyJson().extractingPath("$.items[0].role").isEqualTo("HR");
        assertThat(list(hanBearer, "WAITING")).bodyJson().extractingPath("$.total").isEqualTo(1);

        post(hanBearer, id, "approve", null);

        assertCounts(maiBearer, 0, 0);
        assertCounts(anBearer, 0, 0);
        assertThat(list(anBearer, "SENT")).bodyJson().extractingPath("$.items[0].status").isEqualTo("APPROVED");
        // Hân decided; Mai only had it waiting.
        assertThat(list(hanBearer, "HANDLED")).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(list(maiBearer, "HANDLED")).bodyJson().extractingPath("$.total").isEqualTo(0);
    }

    @Test
    void aReturnedRequestStaysOpenForTheSenderAndComesBackMarkedAsResubmitted() {
        UUID id = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Địa chỉ");
        post(hungBearer, id, "return", "Ghi rõ số nhà");

        assertThat(list(hungBearer, "WAITING")).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(list(hungBearer, "HANDLED")).bodyJson().extractingPath("$.items[0].status")
                .isEqualTo("RETURNED_FOR_INFO");
        assertCounts(anBearer, 0, 1);

        post(anBearer, id, "resubmit", "Đã bổ sung");

        MvcTestResult again = list(hungBearer, "WAITING");
        assertThat(again).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(again).bodyJson().extractingPath("$.items[0].resubmitted").isEqualTo(true);
    }

    @Test
    void waitingIsFilteredByTypeAndSearchedBySender() {
        requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Email");
        requests.submit(tri, ApprovalRequestType.LEAVE, null, "Nghỉ phép");

        assertThat(list(hungBearer, "WAITING")).bodyJson().extractingPath("$.total").isEqualTo(2);
        assertThat(strings(query(hungBearer, "box=WAITING&type=LEAVE"), "$.items[*].sender.fullName"))
                .containsExactly("Cao Minh Trí");
        // By code, in any case (TestEmployees writes the name into the search text with its accents).
        String code = jdbc.queryForObject("select code from employee where id = ?", String.class, an);
        assertThat(strings(query(hungBearer, "box=WAITING&q=" + code.toLowerCase()), "$.items[*].sender.fullName"))
                .containsExactly("Nguyễn Văn An");
        assertThat(query(hungBearer, "box=WAITING&size=1")).bodyJson().extractingPath("$.total").isEqualTo(2);
        assertThat(query(hungBearer, "box=ELSEWHERE")).hasStatus(400);
        assertThat(query(hungBearer, "box=WAITING&size=101")).hasStatus(400);
    }

    @Test
    void anAccountWithoutAnEmployeeHasAnEmptyInbox() {
        requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Email");
        String admin = testAccounts.adminBearer(mvc);

        assertThat(list(admin, "WAITING")).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertCounts(admin, 0, 0);
        assertThat(mvc.get().uri("/api/approvals").exchange()).hasStatus(401);
    }

    MvcTestResult list(String bearer, String box) {
        return query(bearer, "box=" + box);
    }

    MvcTestResult query(String bearer, String query) {
        return mvc.get().uri("/api/approvals?" + query).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    void assertCounts(String bearer, int waiting, int sent) {
        MvcTestResult counts = mvc.get().uri("/api/approvals/counts").header(HttpHeaders.AUTHORIZATION, bearer)
                .exchange();
        assertThat(counts).bodyJson().extractingPath("$.waiting").isEqualTo(waiting);
        assertThat(counts).bodyJson().extractingPath("$.sent").isEqualTo(sent);
    }

    UUID unit(String code, String name, UUID parent) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, ?, 'TEAM', now(), now())""", id, parent, code, name);
        return id;
    }

    String signedIn(UUID employee, Role role) {
        TestAccount account = testAccounts.create(role);
        testEmployees.link(account.id(), employee);
        return testAccounts.bearer(mvc, account);
    }

    MvcTestResult get(String bearer, UUID id) {
        return mvc.get().uri("/api/approvals/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult post(String bearer, UUID id, String action, String comment) {
        String body = comment == null ? "{}" : "{\"comment\":\"" + comment + "\"}";
        return mvc.post().uri("/api/approvals/{id}/{action}", id, action).header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
    }

    static List<String> strings(MvcTestResult result, String path) {
        try {
            return JsonPath.read(result.getResponse().getContentAsString(), path);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    static void assertCode(MvcTestResult result, int status, String code) {
        assertThat(result).hasStatus(status);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo(code);
    }
}
