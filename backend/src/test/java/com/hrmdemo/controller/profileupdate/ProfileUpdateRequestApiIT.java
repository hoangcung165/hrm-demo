package com.hrmdemo.controller.profileupdate;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
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
 * Cập nhật hồ sơ requests against real PostgreSQL: Nguyễn Văn An in Nhóm Web (head Lê Văn Hùng) changes their
 * contact fields; the default flow is Quản lý trực tiếp, then HR (Trần Thị Mai).
 */
@IntegrationTest
class ProfileUpdateRequestApiIT {

    static final String NEW_CONTACT = """
            {"personalEmail": null, "phone": "+84 912 345 678", "address": "12 Lý Thường Kiệt, Hà Nội",
             "emergencyContact": {"name": "Nguyễn Văn Bình", "relationship": "Cha", "phone": "0987.654.321"},
             "note": "Chuyển nhà tháng 10"}""";

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    UUID an;
    String anBearer;
    String hungBearer;
    String maiBearer;
    String triBearer;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        testEmployees.deleteAll();
        jdbc.update("delete from approval_flow_setting");
        jdbc.update("delete from org_unit");
        UUID web = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, 'WEB', 'Nhóm Web', 'TEAM', now(), now())""", web);
        UUID hung = testEmployees.create("Lê Văn Hùng", web);
        an = testEmployees.create("Nguyễn Văn An", web);
        UUID tri = testEmployees.create("Cao Minh Trí", web);
        UUID mai = testEmployees.create("Trần Thị Mai", null);
        testEmployees.makeHead(web, hung);
        jdbc.update("update employee set phone = '0901234567', address = '5 Hàng Bài, Hà Nội' where id = ?", an);
        anBearer = signedIn(an, Role.EMPLOYEE);
        hungBearer = signedIn(hung, Role.LINE_MANAGER);
        maiBearer = signedIn(mai, Role.HR);
        triBearer = signedIn(tri, Role.EMPLOYEE);
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("delete from org_unit");
    }

    @Test
    void theProfileTakesTheChangesOnlyWhenTheLastLevelApproves() {
        MvcTestResult sent = submit(anBearer, NEW_CONTACT);
        assertThat(sent).hasStatus(201);
        String id = JsonPath.read(body(sent), "$.id");
        assertThat(sent).bodyJson().extractingPath("$.status").isEqualTo("PENDING");
        assertThat(sent).bodyJson().extractingPath("$.note").isEqualTo("Chuyển nhà tháng 10");
        assertThat(strings(sent, "$.changes[*].field")).containsExactly("PHONE", "ADDRESS", "EMERGENCY_CONTACT_NAME",
                "EMERGENCY_CONTACT_RELATIONSHIP", "EMERGENCY_CONTACT_PHONE");
        assertThat(sent).bodyJson().extractingPath("$.changes[0].oldValue").isEqualTo("0901234567");
        assertThat(sent).bodyJson().extractingPath("$.changes[0].newValue").isEqualTo("0912345678");
        assertThat(sent).bodyJson().extractingPath("$.changes[4].newValue").isEqualTo("0987654321");

        // The approver reads the content and the request; the list line names the changed fields.
        assertThat(get(hungBearer, id)).hasStatusOk();
        assertThat(approval(hungBearer, id)).bodyJson().extractingPath("$.summary")
                .isEqualTo("Số điện thoại, địa chỉ, người liên hệ khẩn cấp");

        assertThat(decide(hungBearer, id, "approve", null)).hasStatusOk();
        assertThat(profile().get("phone")).isEqualTo("0901234567");

        // HR edits another field meanwhile; the approval does not overwrite it.
        jdbc.update("update employee set personal_email = 'an@example.com' where id = ?", an);
        assertThat(decide(maiBearer, id, "approve", null)).bodyJson().extractingPath("$.status")
                .isEqualTo("APPROVED");

        Map<String, Object> profile = profile();
        assertThat(profile.get("phone")).isEqualTo("0912345678");
        assertThat(profile.get("address")).isEqualTo("12 Lý Thường Kiệt, Hà Nội");
        assertThat(profile.get("emergency_contact_name")).isEqualTo("Nguyễn Văn Bình");
        assertThat(profile.get("emergency_contact_relationship")).isEqualTo("Cha");
        assertThat(profile.get("emergency_contact_phone")).isEqualTo("0987654321");
        assertThat(profile.get("personal_email")).isEqualTo("an@example.com");
        assertThat(get(anBearer, id)).bodyJson().extractingPath("$.status").isEqualTo("APPROVED");
    }

    @Test
    void rejectAndReturnLeaveTheProfileAsItIsAndTheSenderChangesAReturnedRequest() {
        String rejected = JsonPath.read(body(submit(anBearer, NEW_CONTACT)), "$.id");
        assertThat(decide(hungBearer, rejected, "reject", "Sai địa chỉ")).hasStatusOk();
        assertThat(profile().get("phone")).isEqualTo("0901234567");

        // Rejected is closed: a new one may go.
        String id = JsonPath.read(body(submit(anBearer, NEW_CONTACT)), "$.id");
        assertThat(decide(hungBearer, id, "approve", null)).hasStatusOk();
        assertThat(decide(maiBearer, id, "return", "Thiếu số nhà")).hasStatusOk();
        assertThat(profile().get("phone")).isEqualTo("0901234567");
        assertThat(get(anBearer, id)).bodyJson().extractingPath("$.status").isEqualTo("RETURNED_FOR_INFO");

        // Only the sender changes it.
        assertCode(resubmit(maiBearer, id, NEW_CONTACT), 403, "approval.not_sender");
        MvcTestResult changed = resubmit(anBearer, id, """
                {"phone": "0901234567", "address": "12A Lý Thường Kiệt, Hoàn Kiếm, Hà Nội",
                 "emergencyContact": null, "note": "Đã thêm số nhà"}""");
        assertThat(changed).hasStatusOk();
        assertThat(changed).bodyJson().extractingPath("$.status").isEqualTo("PENDING");
        assertThat(strings(changed, "$.changes[*].field")).containsExactly("ADDRESS");
        assertThat(changed).bodyJson().extractingPath("$.note").isEqualTo("Đã thêm số nhà");
        MvcTestResult again = approval(maiBearer, id);
        assertThat(again).bodyJson().extractingPath("$.level").isEqualTo(2);
        assertThat(again).bodyJson().extractingPath("$.summary").isEqualTo("Địa chỉ");
        // Waiting again: nothing to change until it is returned.
        assertCode(resubmit(anBearer, id, NEW_CONTACT), 409, "approval.not_returned");

        decide(maiBearer, id, "approve", null);
        Map<String, Object> profile = profile();
        assertThat(profile.get("address")).isEqualTo("12A Lý Thường Kiệt, Hoàn Kiếm, Hà Nội");
        assertThat(profile.get("phone")).isEqualTo("0901234567");
        assertThat(profile.get("emergency_contact_name")).isNull();
    }

    @Test
    void anEmployeeSendsValidChangesToTheirOwnProfileOneRequestAtATime() {
        assertCode(submit(anBearer, """
                {"phone": "0901234567", "address": "5 Hàng Bài, Hà Nội"}"""), 400, "profile_update.no_change");
        MvcTestResult invalid = submit(anBearer, """
                {"phone": "12345", "address": "5 Hàng Bài, Hà Nội", "personalEmail": "not-an-email"}""");
        assertCode(invalid, 400, "validation.invalid");
        assertThat(strings(invalid, "$.errors[*].field"))
                .containsExactlyInAnyOrder("personal.phone", "personal.personalEmail");

        String id = JsonPath.read(body(submit(anBearer, NEW_CONTACT)), "$.id");
        MvcTestResult second = submit(anBearer, NEW_CONTACT);
        assertCode(second, 409, "profile_update.already_open");
        assertThat(second).bodyJson().extractingPath("$.requestId").isEqualTo(id);

        // Someone not involved does not see it; an Account without an Employee cannot send.
        assertThat(get(triBearer, id)).hasStatus(404);
        assertCode(submit(testAccounts.adminBearer(mvc), NEW_CONTACT), 403, "approval.no_employee");
        assertThat(mvc.post().uri("/api/profile-update-requests").contentType(MediaType.APPLICATION_JSON)
                .content(NEW_CONTACT).exchange()).hasStatus(401);
    }

    Map<String, Object> profile() {
        return jdbc.queryForMap("""
                select phone, address, personal_email, emergency_contact_name, emergency_contact_relationship,
                    emergency_contact_phone from employee where id = ?""", an);
    }

    String signedIn(UUID employee, Role role) {
        TestAccount account = testAccounts.create(role);
        testEmployees.link(account.id(), employee);
        return testAccounts.bearer(mvc, account);
    }

    MvcTestResult submit(String bearer, String json) {
        return mvc.post().uri("/api/profile-update-requests").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    MvcTestResult resubmit(String bearer, String id, String json) {
        return mvc.put().uri("/api/profile-update-requests/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    MvcTestResult get(String bearer, String id) {
        return mvc.get().uri("/api/profile-update-requests/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer)
                .exchange();
    }

    MvcTestResult approval(String bearer, String id) {
        return mvc.get().uri("/api/approvals/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult decide(String bearer, String id, String action, String comment) {
        String json = comment == null ? "{}" : "{\"comment\":\"" + comment + "\"}";
        return mvc.post().uri("/api/approvals/{id}/{action}", id, action).header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString();
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    static List<String> strings(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }

    static void assertCode(MvcTestResult result, int status, String code) {
        assertThat(result).hasStatus(status);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo(code);
    }
}
