package com.hrmdemo.controller.notification;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
import com.hrmdemo.support.TestEmployees;
import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.ServerSetupTest;
import com.jayway.jsonpath.JsonPath;
import jakarta.mail.Message;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * The bell and the approval emails against real PostgreSQL and GreenMail, on the same small company as the
 * approval ITs: Phòng Phát triển phần mềm (head Khoa) with Nhóm
 * Web (head Hùng, member An), and two HR people, Mai and Hân, directly under the company. Profile updates use the
 * default flow: Quản lý trực tiếp, then HR.
 */
@IntegrationTest
class NotificationApiIT {

    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP).withPerMethodLifecycle(false);

    final Map<UUID, String> emails = new HashMap<>();

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
    void setUp() throws Exception {
        greenMail.purgeEmailFromAllMailboxes();
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
    void theApproversThenTheSenderAreToldAndEmailedAsTheRequestMovesOn() throws Exception {
        UUID id = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Số điện thoại, địa chỉ");

        MvcTestResult bell = bell(hungBearer);
        assertThat(bell).bodyJson().extractingPath("$.unread").isEqualTo(1);
        assertThat(bell).bodyJson().extractingPath("$.items[0].kind").isEqualTo("APPROVAL_WAITING");
        assertThat(bell).bodyJson().extractingPath("$.items[0].actor.fullName").isEqualTo("Nguyễn Văn An");
        assertThat(bell).bodyJson().extractingPath("$.items[0].requestId").isEqualTo(id.toString());
        assertThat(bell).bodyJson().extractingPath("$.items[0].requestType").isEqualTo("PROFILE_UPDATE");
        assertThat(bell).bodyJson().extractingPath("$.items[0].summary").isEqualTo("Số điện thoại, địa chỉ");
        assertThat(bell).bodyJson().extractingPath("$.items[0].read").isEqualTo(false);
        assertThat(subjectsTo(hung)).containsExactly("[Chờ duyệt] Cập nhật hồ sơ của Nguyễn Văn An");
        assertThat(bodyTo(hung)).contains("/approvals/" + id).contains("Cấp 1");
        assertThat(bell(anBearer)).bodyJson().extractingPath("$.total").isEqualTo(0);

        post(hungBearer, id, "approve", null);
        assertThat(bell(maiBearer)).bodyJson().extractingPath("$.items[0].kind").isEqualTo("APPROVAL_WAITING");
        assertThat(bell(hanBearer)).bodyJson().extractingPath("$.items[0].level").isEqualTo(2);
        assertThat(subjectsTo(mai)).hasSize(1);
        assertThat(bell(anBearer)).bodyJson().extractingPath("$.total").isEqualTo(0);

        post(hanBearer, id, "approve", null);
        MvcTestResult sender = bell(anBearer);
        assertThat(sender).bodyJson().extractingPath("$.items[0].kind").isEqualTo("APPROVAL_APPROVED");
        assertThat(sender).bodyJson().extractingPath("$.items[0].actor.fullName").isEqualTo("Trương Thị Ngọc Hân");
        assertThat(subjectsTo(an)).containsExactly("[Đã duyệt] Cập nhật hồ sơ của bạn");
    }

    @Test
    void theSenderHearsOfAReturnAndARejectAndTheApproverOfTheResubmit() throws Exception {
        UUID returned = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Địa chỉ");
        post(hungBearer, returned, "return", "Ghi rõ số nhà");
        assertThat(bell(anBearer)).bodyJson().extractingPath("$.items[0].kind").isEqualTo("APPROVAL_RETURNED");
        assertThat(bodyTo(an)).contains("Ghi rõ số nhà").contains("Sửa và gửi lại");

        post(anBearer, returned, "resubmit", null);
        assertThat(bell(hungBearer)).bodyJson().extractingPath("$.items[0].kind").isEqualTo("APPROVAL_RESUBMITTED");
        assertThat(subjectsTo(hung)).contains("[Chờ duyệt] Nguyễn Văn An đã bổ sung Cập nhật hồ sơ");

        UUID rejected = requests.submit(an, ApprovalRequestType.LEAVE, null, "Nghỉ phép");
        post(hungBearer, rejected, "reject", "Trùng ngày bàn giao");
        assertThat(bell(anBearer)).bodyJson().extractingPath("$.items[0].kind").isEqualTo("APPROVAL_REJECTED");
        assertThat(subjectsTo(an)).contains("[Bị từ chối] Nghỉ phép của bạn");

        // A refused action tells nobody.
        long before = count(anBearer);
        post(hungBearer, requests.submit(an, ApprovalRequestType.LEAVE, null, "Nghỉ phép"), "reject", " ");
        assertThat(count(anBearer)).isEqualTo(before);
    }

    @Test
    void notificationsAreReadOneByOneOrAllAtOnceAndOnlyByTheirRecipient() {
        requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Email");
        requests.submit(tri, ApprovalRequestType.LEAVE, null, "Nghỉ phép");
        MvcTestResult bell = bell(hungBearer);
        assertThat(bell).bodyJson().extractingPath("$.unread").isEqualTo(2);
        String first = JsonPath.read(body(bell), "$.items[0].id");

        assertThat(mvc.post().uri("/api/notifications/{id}/read", first).header(HttpHeaders.AUTHORIZATION, maiBearer)
                .exchange()).hasStatus(404);
        MvcTestResult read = mvc.post().uri("/api/notifications/{id}/read", first)
                .header(HttpHeaders.AUTHORIZATION, hungBearer).exchange();
        assertThat(read).bodyJson().extractingPath("$.unread").isEqualTo(1);
        assertThat(bell(hungBearer)).bodyJson().extractingPath("$.items[?(@.read == true)].id").asArray()
                .containsExactly(first);
        assertThat(mvc.post().uri("/api/notifications/read-all").header(HttpHeaders.AUTHORIZATION, hungBearer)
                .exchange()).bodyJson().extractingPath("$.unread").isEqualTo(0);
        assertThat(count(hungBearer)).isZero();
        assertThat(bell(testAccounts.adminBearer(mvc))).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(mvc.get().uri("/api/notifications").exchange()).hasStatus(401);
    }

    @Test
    void theDelegateIsToldOfANewDelegation() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        assertThat(mvc.post().uri("/api/approval-delegations").header(HttpHeaders.AUTHORIZATION, hungBearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"delegateId\":\"" + tri + "\",\"startDate\":\"" + today + "\",\"endDate\":\""
                        + today.plusDays(2) + "\",\"requestTypes\":[\"LEAVE\"]}")
                .exchange()).hasStatus(201);

        MvcTestResult bell = bell(triBearer);
        assertThat(bell).bodyJson().extractingPath("$.items[0].kind").isEqualTo("DELEGATION_RECEIVED");
        assertThat(bell).bodyJson().extractingPath("$.items[0].actor.fullName").isEqualTo("Lê Văn Hùng");
        assertThat(bell).bodyJson().extractingPath("$.items[0].delegationId").isNotNull();
    }

    MvcTestResult bell(String bearer) {
        return mvc.get().uri("/api/notifications").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    long count(String bearer) {
        Number unread = JsonPath.read(body(mvc.get().uri("/api/notifications/unread-count")
                .header(HttpHeaders.AUTHORIZATION, bearer).exchange()), "$.unread");
        return unread.longValue();
    }

    List<String> subjectsTo(UUID employee) throws Exception {
        String to = emails.get(employee);
        List<String> subjects = new ArrayList<>();
        for (MimeMessage message : greenMail.getReceivedMessages()) {
            if (message.getRecipients(Message.RecipientType.TO)[0].toString().equals(to)) {
                subjects.add(message.getSubject());
            }
        }
        return subjects;
    }

    String bodyTo(UUID employee) throws Exception {
        String to = emails.get(employee);
        String last = null;
        for (MimeMessage message : greenMail.getReceivedMessages()) {
            if (message.getRecipients(Message.RecipientType.TO)[0].toString().equals(to)) {
                last = message.getContent().toString();
            }
        }
        assertThat(last).as("mail to " + to).isNotNull();
        return last;
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString();
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
        emails.put(employee, account.email());
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
