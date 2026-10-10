package com.hrmdemo.controller.approval;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
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
 * Ủy quyền duyệt against real PostgreSQL, on the same small company as {@link ApprovalRequestApiIT}: Phòng Phát triển phần mềm (head Khoa) with Nhóm
 * Web (head Hùng, member An), and two HR people, Mai and Hân, directly under the company. Profile updates use the
 * default flow: Quản lý trực tiếp, then HR.
 */
@IntegrationTest
class ApprovalDelegationApiIT {

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

    static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

    @Test
    void aDelegateApprovesARequestThatWasAlreadyWaitingAndTheLogNamesWhoTheyStoodInFor() {
        UUID id = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Email");
        assertThat(list(triBearer)).bodyJson().extractingPath("$.total").isEqualTo(0);

        MvcTestResult created = delegate(hungBearer, tri, TODAY, TODAY.plusDays(3), "PROFILE_UPDATE", "LEAVE");
        assertThat(created).hasStatus(201);
        assertThat(created).bodyJson().extractingPath("$.status").isEqualTo("ACTIVE");
        assertThat(created).bodyJson().extractingPath("$.delegate.fullName").isEqualTo("Cao Minh Trí");
        assertThat(strings(created, "$.requestTypes[*]")).containsExactly("PROFILE_UPDATE", "LEAVE");

        MvcTestResult waiting = list(triBearer);
        assertThat(waiting).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(waiting).bodyJson().extractingPath("$.items[0].onBehalfOf.fullName").isEqualTo("Lê Văn Hùng");
        assertThat(counts(triBearer)).bodyJson().extractingPath("$.waiting").isEqualTo(1);
        MvcTestResult detail = get(triBearer, id);
        assertThat(detail).bodyJson().extractingPath("$.allowed.decide").isEqualTo(true);
        assertThat(detail).bodyJson().extractingPath("$.allowed.onBehalfOf.fullName").isEqualTo("Lê Văn Hùng");

        MvcTestResult approved = post(triBearer, id, "approve", null);
        assertThat(approved).bodyJson().extractingPath("$.steps[0].decidedBy.fullName").isEqualTo("Cao Minh Trí");
        assertThat(approved).bodyJson().extractingPath("$.steps[0].onBehalfOf.fullName").isEqualTo("Lê Văn Hùng");
        assertThat(approved).bodyJson().extractingPath("$.log[2].event").isEqualTo("LEVEL_APPROVED");
        assertThat(approved).bodyJson().extractingPath("$.log[2].onBehalfOf.fullName").isEqualTo("Lê Văn Hùng");
        // Both see the delegation, from their side.
        assertThat(mine(hungBearer)).bodyJson().extractingPath("$.given[0].delegate.fullName").isEqualTo("Cao Minh Trí");
        assertThat(mine(triBearer)).bodyJson().extractingPath("$.received[0].delegator.fullName")
                .isEqualTo("Lê Văn Hùng");
    }

    @Test
    void theDelegatorKeepsActingAndWhoeverActsFirstWins() {
        delegate(hungBearer, tri, TODAY, TODAY.plusDays(3), "LEAVE");
        UUID id = requests.submit(an, ApprovalRequestType.LEAVE, null, "Nghỉ phép 20/10/2026");

        MvcTestResult first = post(hungBearer, id, "approve", null);
        assertThat(first).bodyJson().extractingPath("$.status").isEqualTo("APPROVED");
        assertThat(first).bodyJson().extractingPath("$.steps[0].onBehalfOf").isNull();

        MvcTestResult late = post(triBearer, id, "approve", null);
        assertThat(late).hasStatus(409);
        assertThat(late).bodyJson().extractingPath("$.code").isEqualTo("approval.already_handled");
    }

    @Test
    void aDelegationCoversOnlyItsTypesItsDaysFlowsThatAllowItAndNeverTheDelegatesOwnRequests() {
        delegate(hungBearer, tri, TODAY, TODAY.plusDays(3), "LEAVE");
        requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Email");
        assertThat(list(triBearer)).bodyJson().extractingPath("$.total").isEqualTo(0);

        // Trí's own leave goes to Hùng; Trí never approves it, even holding Hùng's delegation.
        UUID own = requests.submit(tri, ApprovalRequestType.LEAVE, null, "Nghỉ phép");
        assertThat(list(triBearer)).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(post(triBearer, own, "approve", null)).hasStatus(403);

        // A flow without delegation: new leave requests are Hùng's alone.
        String admin = testAccounts.adminBearer(mvc);
        assertThat(mvc.put().uri("/api/approval-flows/LEAVE").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"levels\":[{\"rule\":\"LINE_MANAGER\"}],\"autoApproveDays\":3,\"delegationAllowed\":false}")
                .exchange()).hasStatusOk();
        UUID locked = requests.submit(an, ApprovalRequestType.LEAVE, null, "Nghỉ phép");
        assertThat(get(triBearer, locked)).hasStatus(404);
        assertThat(list(triBearer)).bodyJson().extractingPath("$.total").isEqualTo(0);
    }

    @Test
    void anUpcomingDelegationIsCancelledAndAnActiveOneIsEndedEarly() {
        requests.submit(an, ApprovalRequestType.LEAVE, null, "Nghỉ phép");
        String upcoming = id(delegate(hungBearer, tri, TODAY.plusDays(5), TODAY.plusDays(6), "LEAVE"));
        assertThat(list(triBearer)).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(mine(hungBearer)).bodyJson().extractingPath("$.given[0].status").isEqualTo("UPCOMING");
        assertThat(end(hungBearer, upcoming)).hasStatus(409);
        assertThat(cancel(triBearer, upcoming)).hasStatus(404);
        assertThat(cancel(hungBearer, upcoming)).hasStatus(204);

        String active = id(delegate(hungBearer, tri, TODAY, TODAY.plusDays(2), "LEAVE"));
        assertThat(list(triBearer)).bodyJson().extractingPath("$.total").isEqualTo(1);
        MvcTestResult notUpcoming = cancel(hungBearer, active);
        assertThat(notUpcoming).hasStatus(409);
        assertThat(notUpcoming).bodyJson().extractingPath("$.code").isEqualTo("approval_delegation.not_upcoming");
        MvcTestResult ended = end(hungBearer, active);
        assertThat(ended).bodyJson().extractingPath("$.status").isEqualTo("ENDED");
        assertThat(ended).bodyJson().extractingPath("$.endedAt").isNotNull();
        assertThat(list(triBearer)).bodyJson().extractingPath("$.total").isEqualTo(0);
        // Ended, the days are free again.
        assertThat(delegate(hungBearer, tri, TODAY, TODAY.plusDays(2), "LEAVE")).hasStatus(201);
    }

    @Test
    void theRulesOfADelegationAreCheckedWithTheirOwnCodes() {
        assertCode(delegate(hungBearer, tri, TODAY.plusDays(2), TODAY.plusDays(1), "LEAVE"), 400,
                "approval_delegation.end_before_start");
        assertCode(delegate(hungBearer, tri, TODAY.minusDays(1), TODAY, "LEAVE"), 400,
                "approval_delegation.start_in_past");
        assertCode(delegate(hungBearer, hung, TODAY, TODAY, "LEAVE"), 400, "approval_delegation.self");
        assertCode(delegate(hungBearer, tri, TODAY, TODAY, "PAYROLL"), 400, "approval_delegation.payroll");
        assertCode(delegate(hungBearer, UUID.randomUUID(), TODAY, TODAY, "LEAVE"), 400,
                "approval_delegation.delegate_not_found");
        assertCode(delegate(hungBearer, tri, TODAY, TODAY), 400, "validation.invalid");
        delegate(hungBearer, tri, TODAY, TODAY.plusDays(5), "LEAVE", "OVERTIME");
        assertCode(delegate(hungBearer, mai, TODAY.plusDays(5), TODAY.plusDays(9), "OVERTIME"), 409,
                "approval_delegation.overlap");
        // Other types on the same days are fine.
        assertThat(delegate(hungBearer, mai, TODAY.plusDays(5), TODAY.plusDays(9), "PROFILE_UPDATE")).hasStatus(201);
        assertCode(mine(testAccounts.adminBearer(mvc)), 403, "approval.no_employee");
    }

    MvcTestResult delegate(String bearer, UUID delegate, LocalDate from, LocalDate to, String... types) {
        String list = String.join(",", java.util.Arrays.stream(types).map(t -> "\"" + t + "\"").toList());
        return mvc.post().uri("/api/approval-delegations").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"delegateId\":\"" + delegate + "\",\"startDate\":\"" + from + "\",\"endDate\":\"" + to
                        + "\",\"requestTypes\":[" + list + "]}")
                .exchange();
    }

    MvcTestResult mine(String bearer) {
        return mvc.get().uri("/api/approval-delegations").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult end(String bearer, String id) {
        return mvc.post().uri("/api/approval-delegations/{id}/end", id).header(HttpHeaders.AUTHORIZATION, bearer)
                .exchange();
    }

    MvcTestResult cancel(String bearer, String id) {
        return mvc.delete().uri("/api/approval-delegations/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer)
                .exchange();
    }

    MvcTestResult list(String bearer) {
        return mvc.get().uri("/api/approvals?box=WAITING").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult counts(String bearer) {
        return mvc.get().uri("/api/approvals/counts").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    static String id(MvcTestResult result) {
        try {
            return JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
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
