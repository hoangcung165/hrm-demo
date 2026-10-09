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
 * Approval requests against real PostgreSQL, on a small company: Phòng Phát triển phần mềm (head Khoa) with Nhóm
 * Web (head Hùng, member An), and two HR people, Mai and Hân, directly under the company. Profile updates use the
 * default flow: Quản lý trực tiếp, then HR.
 */
@IntegrationTest
class ApprovalRequestApiIT {

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
    void aProfileUpdateGoesThroughTheLineManagerAndHrAndTheLogNamesEveryone() {
        UUID id = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Số điện thoại, địa chỉ");

        MvcTestResult waiting = get(hungBearer, id);
        assertThat(waiting).hasStatusOk();
        assertThat(waiting).bodyJson().extractingPath("$.type").isEqualTo("PROFILE_UPDATE");
        assertThat(waiting).bodyJson().extractingPath("$.summary").isEqualTo("Số điện thoại, địa chỉ");
        assertThat(waiting).bodyJson().extractingPath("$.sender.fullName").isEqualTo("Nguyễn Văn An");
        assertThat(waiting).bodyJson().extractingPath("$.sender.orgUnitName").isEqualTo("Nhóm Web");
        assertThat(waiting).bodyJson().extractingPath("$.levelCount").isEqualTo(2);
        assertThat(waiting).bodyJson().extractingPath("$.steps[0].rule").isEqualTo("LINE_MANAGER");
        assertThat(waiting).bodyJson().extractingPath("$.steps[0].approvers[0].fullName").isEqualTo("Lê Văn Hùng");
        assertThat(waiting).bodyJson().extractingPath("$.autoApproveDueAt").isNotNull();
        assertThat(waiting).bodyJson().extractingPath("$.allowed.decide").isEqualTo(true);
        assertThat(get(anBearer, id)).bodyJson().extractingPath("$.allowed.cancel").isEqualTo(true);
        assertThat(get(maiBearer, id)).hasStatus(404);

        MvcTestResult first = post(hungBearer, id, "approve", "Đã kiểm tra với An");
        assertThat(first).hasStatusOk();
        assertThat(first).bodyJson().extractingPath("$.status").isEqualTo("PENDING");
        assertThat(first).bodyJson().extractingPath("$.level").isEqualTo(2);
        assertThat(first).bodyJson().extractingPath("$.steps[0].state").isEqualTo("DONE");
        assertThat(first).bodyJson().extractingPath("$.steps[0].decidedBy.fullName").isEqualTo("Lê Văn Hùng");
        assertThat(first).bodyJson().extractingPath("$.steps[0].comment").isEqualTo("Đã kiểm tra với An");
        assertThat(first).bodyJson().extractingPath("$.steps[1].state").isEqualTo("WAITING");
        assertThat(strings(first, "$.steps[1].approvers[*].fullName"))
                .containsExactlyInAnyOrder("Trần Thị Mai", "Trương Thị Ngọc Hân");
        assertThat(first).bodyJson().extractingPath("$.allowed.decide").isEqualTo(false);
        assertThat(get(hungBearer, id)).hasStatusOk();
        assertThat(get(maiBearer, id)).bodyJson().extractingPath("$.allowed.decide").isEqualTo(true);

        MvcTestResult last = post(hanBearer, id, "approve", null);
        assertThat(last).bodyJson().extractingPath("$.status").isEqualTo("APPROVED");
        assertThat(last).bodyJson().extractingPath("$.steps[1].decidedBy.fullName").isEqualTo("Trương Thị Ngọc Hân");
        assertThat(strings(last, "$.log[*].event")).containsExactly("SUBMITTED", "LEVEL_REACHED", "LEVEL_APPROVED",
                "LEVEL_REACHED", "APPROVED");
        // The sender sees the outcome; the other HR person can no longer act.
        assertThat(get(anBearer, id)).bodyJson().extractingPath("$.status").isEqualTo("APPROVED");
        assertThat(get(anBearer, id)).bodyJson().extractingPath("$.allowed.cancel").isEqualTo(false);
    }

    @Test
    void theWrongPersonCannotDecideEvenThroughTheApi() {
        UUID id = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Email");

        // HR is level 2: not yet.
        MvcTestResult early = post(maiBearer, id, "approve", null);
        assertThat(early).hasStatus(404);
        assertThat(early).bodyJson().extractingPath("$.code").isEqualTo("approval.not_found");
        // The sender cannot approve their own request.
        assertCode(post(anBearer, id, "approve", null), 403, "approval.not_approver");
        // A colleague of the same team sees nothing.
        assertThat(get(triBearer, id)).hasStatus(404);
        // Once Hùng has approved, he still sees it but cannot approve level 2.
        post(hungBearer, id, "approve", null);
        assertCode(post(hungBearer, id, "approve", null), 403, "approval.not_approver");
        assertThat(get(hungBearer, id)).hasStatusOk();
    }

    @Test
    void rejectEndsItAndReturnContinuesAtTheSameLevel() {
        UUID rejected = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Email");
        assertCode(post(hungBearer, rejected, "reject", "  "), 400, "approval.reason_required");
        MvcTestResult reject = post(hungBearer, rejected, "reject", "Thiếu giấy tờ");
        assertThat(reject).bodyJson().extractingPath("$.status").isEqualTo("REJECTED");
        assertThat(reject).bodyJson().extractingPath("$.steps[0].state").isEqualTo("REJECTED");
        assertThat(reject).bodyJson().extractingPath("$.steps[1].state").isEqualTo("NOT_REACHED");
        assertCode(post(anBearer, rejected, "resubmit", null), 409, "approval.not_returned");
        assertThat(get(anBearer, rejected)).bodyJson().extractingPath("$.allowed.resubmit").isEqualTo(false);

        UUID returned = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Địa chỉ");
        post(hungBearer, returned, "approve", null);
        MvcTestResult back = post(maiBearer, returned, "return", "Ghi rõ số nhà");
        assertThat(back).bodyJson().extractingPath("$.status").isEqualTo("RETURNED_FOR_INFO");
        assertThat(back).bodyJson().extractingPath("$.autoApproveDueAt").isNull();
        assertThat(get(anBearer, returned)).bodyJson().extractingPath("$.allowed.resubmit").isEqualTo(true);
        assertCode(post(maiBearer, returned, "resubmit", null), 403, "approval.not_sender");

        MvcTestResult again = post(anBearer, returned, "resubmit", "Đã bổ sung");
        assertThat(again).bodyJson().extractingPath("$.status").isEqualTo("PENDING");
        assertThat(again).bodyJson().extractingPath("$.level").isEqualTo(2);
        assertThat(strings(again, "$.log[*].event")).containsSubsequence("RETURNED", "RESUBMITTED",
                "LEVEL_REACHED");
        assertThat(get(hanBearer, returned)).bodyJson().extractingPath("$.allowed.decide").isEqualTo(true);
    }

    @Test
    void theSenderCancelsAndASecondDecisionOnAHandledRequestIsAConflict() {
        UUID id = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Email");
        post(hungBearer, id, "approve", null);
        post(maiBearer, id, "approve", null);

        // Hân's page still showed the buttons.
        MvcTestResult late = post(hanBearer, id, "approve", null);
        assertCode(late, 409, "approval.already_handled");
        assertThat(late).bodyJson().extractingPath("$.status").isEqualTo("APPROVED");

        UUID other = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Liên hệ khẩn cấp");
        assertCode(post(hungBearer, other, "cancel", null), 403, "approval.not_sender");
        MvcTestResult cancelled = post(anBearer, other, "cancel", null);
        assertThat(cancelled).bodyJson().extractingPath("$.status").isEqualTo("CANCELLED");
        assertThat(cancelled).bodyJson().extractingPath("$.steps[0].state").isEqualTo("CANCELLED");
        assertThat(get(hungBearer, other)).hasStatus(404);
    }

    @Test
    void aLineManagerSendingTheirOwnRequestGoesUpToTheHeadAbove() {
        // Hùng is the head of Nhóm Web: his Quản lý trực tiếp is Khoa, the head of the unit above.
        UUID id = requests.submit(hung, ApprovalRequestType.LEAVE, null, "Nghỉ phép 13/10–14/10/2026");

        MvcTestResult detail = get(khoaBearer, id);
        assertThat(detail).bodyJson().extractingPath("$.steps[0].approvers[0].fullName").isEqualTo("Nguyễn Văn Khoa");
        assertThat(detail).bodyJson().extractingPath("$.allowed.decide").isEqualTo(true);

        // Khoa heads the top unit: nobody above him, so his own request ends with HR.
        UUID khoasOwn = requests.submit(khoa, ApprovalRequestType.LEAVE, null, "Nghỉ phép 20/10/2026");
        MvcTestResult escalated = get(maiBearer, khoasOwn);
        assertThat(escalated).hasStatusOk();
        assertThat(escalated).bodyJson().extractingPath("$.steps[0].escalated").isEqualTo(true);
        assertThat(strings(escalated, "$.log[*].event")).containsExactly("SUBMITTED", "ESCALATED", "LEVEL_REACHED");
        assertThat(escalated).bodyJson().extractingPath("$.log[1].escalatedTo").isEqualTo("HR_ROLE");
    }

    @Test
    void anAccountWithoutAnEmployeeCannotOpenOrDecide() {
        UUID id = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Email");
        String admin = testAccounts.adminBearer(mvc);

        assertCode(get(admin, id), 403, "approval.no_employee");
        assertCode(post(admin, id, "approve", null), 403, "approval.no_employee");
        assertThat(get(hungBearer, UUID.randomUUID())).hasStatus(404);
        assertThat(mvc.get().uri("/api/approvals/{id}", id).exchange()).hasStatus(401);
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
