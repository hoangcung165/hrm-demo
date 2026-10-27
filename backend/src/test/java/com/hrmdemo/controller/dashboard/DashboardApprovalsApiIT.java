package com.hrmdemo.controller.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.MutableClock;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * "Chờ bạn duyệt" on the Tổng quan page (HRM-20/BE-2) against real PostgreSQL, on a clock fixed to Wednesday
 * 04/11/2026. Nhóm Web: Lê Văn Hùng (Quản lý trực tiếp), Nguyễn Văn An, Phạm Thị Bình and Vũ Thị Cúc, all hired on
 * 01/01/2026. Trần Thị Mai and Trương Thị Ngọc Hân are HR. A profile update goes to Hùng, then to HR; a Đơn nghỉ goes to
 * Hùng only. Deciding goes through the same endpoints as the Hộp thư duyệt.
 */
@IntegrationTest
@Import(DashboardApprovalsApiIT.Clocks.class)
class DashboardApprovalsApiIT {

    static final Instant WEDNESDAY = Instant.parse("2026-11-04T03:00:00Z");
    static final LocalDate TODAY = LocalDate.of(2026, 11, 4);
    static final byte[] PDF = "%PDF-1.4\n% medical certificate\n".getBytes(StandardCharsets.US_ASCII);

    @TestConfiguration(proxyBeanMethods = false)
    static class Clocks {

        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(WEDNESDAY);
        }
    }

    @Autowired
    MockMvcTester mvc;
    @Autowired
    MutableClock clock;
    @Autowired
    ApprovalRequestService requests;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;
    final Map<UUID, TestAccounts.TestAccount> accounts = new HashMap<>();
    UUID hung;
    UUID an;
    UUID binh;
    UUID cuc;
    UUID mai;
    UUID han;
    String annual;
    String sick;

    @BeforeEach
    void setUp() {
        clock.set(WEDNESDAY);
        accounts.clear();
        jdbc = new JdbcTemplate(dataSource);
        cleanUp();
        UUID web = unit("WEB", "Nhóm Web");
        hung = testEmployees.create("Lê Văn Hùng", web);
        an = testEmployees.create("Nguyễn Văn An", web);
        binh = testEmployees.create("Phạm Thị Bình", web);
        cuc = testEmployees.create("Vũ Thị Cúc", web);
        mai = testEmployees.create("Trần Thị Mai", null);
        han = testEmployees.create("Trương Thị Ngọc Hân", null);
        testEmployees.makeHead(web, hung);
        jdbc.update("update employee set hire_date = ? where id in (?, ?, ?)", LocalDate.of(2026, 1, 1), an, binh,
                cuc);
        signedIn(hung, Role.LINE_MANAGER);
        signedIn(mai, Role.HR);
        signedIn(han, Role.HR);
        annual = jdbc.queryForObject("select id::text from leave_type where code = 'PN'", String.class);
        sick = jdbc.queryForObject("select id::text from leave_type where code = 'OM'", String.class);
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
        jdbc.update("update leave_policy set entitlement_days = 12.0 where leave_type_id = "
                + "(select id from leave_type where code = 'PN')");
        jdbc.update("delete from org_unit");
    }

    @Test
    void theListIsTheWaitingTabOfTheInboxInTheSameOrderAndNothingIsWarnedAboutAPlainRequest() {
        requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Số điện thoại, địa chỉ");
        String leave = submit(an, request(annual, workingDay(DayOfWeek.MONDAY), "FULL", null));

        MvcTestResult dashboard = approvals(hung, "");
        MvcTestResult inbox = mvc.get().uri("/api/approvals?box=WAITING").header(HttpHeaders.AUTHORIZATION, bearer(hung))
                .exchange();

        assertThat(dashboard).hasStatusOk();
        assertThat(strings(dashboard, "$.items[*].request.id")).containsExactlyElementsOf(strings(inbox, "$.items[*].id"))
                .hasSize(2).contains(leave);
        assertThat(integer(dashboard, "$.total")).isEqualTo(2);
        assertThat(strings(dashboard, "$.items[*].request.sender.fullName")).containsOnly("Nguyễn Văn An");
        assertThat(strings(dashboard, "$.items[*].warnings[*]")).isEmpty();
        assertThat(JsonPath.<List<Boolean>>read(body(dashboard), "$.items[*].quickApprovable")).containsOnly(true);
        // Someone with nothing waiting sees an empty block, and so does an HR person before the first level decided.
        assertThat(integer(approvals(mai, ""), "$.total")).isZero();
        assertThat(strings(approvals(mai, ""), "$.items[*].request.id")).isEmpty();
    }

    @Test
    void limitCutsTheListButTheTotalCountsEveryWaitingRequest() {
        for (int i = 0; i < 3; i++) {
            requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Cập nhật " + i);
        }

        MvcTestResult two = approvals(hung, "?limit=2");

        assertThat(strings(two, "$.items[*].request.id")).hasSize(2);
        assertThat(integer(two, "$.total")).isEqualTo(3);
        assertThat(approvals(hung, "?limit=0")).hasStatus(400);
        assertThat(approvals(hung, "?limit=21")).hasStatus(400);
        assertThat(mvc.get().uri("/api/dashboard/approvals").exchange()).hasStatus(401);
    }

    @Test
    void leaveBeyondWhatHasAccruedIsAnAdvanceAndCannotBeQuickApproved() {
        // One day a year: 11 of 12 months have accrued by November, so a whole day is 0.92 accrued and 0.08 advance,
        // while a half day is still covered by what has accrued.
        setAnnualEntitlement("1.0");
        String advance = submit(an, request(annual, workingDay(DayOfWeek.MONDAY), "FULL", null));
        String plain = submit(binh, request(annual, workingDay(DayOfWeek.TUESDAY), "AFTERNOON", null));

        MvcTestResult dashboard = approvals(hung, "");

        assertThat(strings(dashboard, "$.items[?(@.request.id == '" + advance + "')].warnings[*].code"))
                .containsExactly("leave.advance");
        assertThat(JsonPath.<List<Boolean>>read(body(dashboard),
                "$.items[?(@.request.id == '" + advance + "')].quickApprovable")).containsExactly(false);
        assertThat(strings(dashboard, "$.items[?(@.request.id == '" + plain + "')].warnings[*].code")).isEmpty();
    }

    @Test
    void leaveBeyondTheBalanceEvenWithAnAdvanceIsOverBalance() {
        String request = submit(an, request(annual, workingDay(DayOfWeek.MONDAY), "FULL", null));
        // The policy changed while the request waited: half a day a year no longer covers the day.
        setAnnualEntitlement("0.5");

        MvcTestResult dashboard = approvals(hung, "");

        assertThat(strings(dashboard, "$.items[?(@.request.id == '" + request + "')].warnings[*].code"))
                .containsExactly("leave.over_balance");
        assertThat(JsonPath.<List<Boolean>>read(body(dashboard), "$.items[*].quickApprovable")).containsExactly(false);
    }

    @Test
    void aRequestWithFilesToCheckIsOpenedNotApprovedInOneClick() {
        MvcTestResult uploaded = mvc.perform(multipart("/api/leave-attachments")
                .file(new MockMultipartFile("file", "giay-kham.pdf", "application/pdf", PDF))
                .header(HttpHeaders.AUTHORIZATION, bearer(an)));
        assertThat(uploaded).hasStatus(201);
        String file = JsonPath.read(body(uploaded), "$.id");
        String id = submit(an, request(sick, workingDay(DayOfWeek.MONDAY), "FULL", file));

        MvcTestResult dashboard = approvals(hung, "");

        assertThat(strings(dashboard, "$.items[?(@.request.id == '" + id + "')].warnings[*].code"))
                .containsExactly("leave.attachment");
        assertThat(JsonPath.<List<Integer>>read(body(dashboard),
                "$.items[?(@.request.id == '" + id + "')].warnings[0].details.count")).containsExactly(1);
        assertThat(JsonPath.<List<Boolean>>read(body(dashboard), "$.items[*].quickApprovable")).containsExactly(false);
    }

    @Test
    void approvingFromTheDashboardMovesTheRequestOnExactlyAsTheInboxDoes() {
        UUID id = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Email");

        MvcTestResult first = decide(hung, id, "approve");

        assertThat(first).hasStatusOk();
        assertThat(string(first, "$.status")).isEqualTo("PENDING");
        assertThat(integer(first, "$.level")).isEqualTo(2);
        assertThat(strings(first, "$.log[*].event")).containsExactly("SUBMITTED", "LEVEL_REACHED", "LEVEL_APPROVED",
                "LEVEL_REACHED");
        // It left Hùng's block and is at HR's, who are told.
        assertThat(integer(approvals(hung, ""), "$.total")).isZero();
        assertThat(strings(approvals(mai, ""), "$.items[*].request.id")).containsExactly(id.toString());
        assertThat(strings(approvals(han, ""), "$.items[*].request.id")).containsExactly(id.toString());
        assertThat(string(mvc.get().uri("/api/notifications").header(HttpHeaders.AUTHORIZATION, bearer(mai)).exchange(),
                "$.items[0].kind")).isNotBlank();

        MvcTestResult last = decide(mai, id, "approve");
        assertThat(string(last, "$.status")).isEqualTo("APPROVED");
        assertThat(integer(approvals(han, ""), "$.total")).isZero();
    }

    @Test
    void aRequestDecidedByAnotherApproverMeanwhileIsAConflictNotAnError() {
        UUID id = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Email");
        decide(hung, id, "approve");
        // Hân's block still showed the request when Mai approved it.
        assertThat(strings(approvals(han, ""), "$.items[*].request.id")).containsExactly(id.toString());
        assertThat(decide(mai, id, "approve")).hasStatusOk();

        MvcTestResult late = decide(han, id, "approve");

        assertThat(late).hasStatus(409);
        assertThat(string(late, "$.code")).isEqualTo("approval.already_handled");
        assertThat(string(late, "$.status")).isEqualTo("APPROVED");
    }

    @Test
    void rejectingNeedsAReasonAndTakesTheRequestOffTheList() {
        UUID id = requests.submit(an, ApprovalRequestType.PROFILE_UPDATE, null, "Email");

        MvcTestResult withoutReason = decide(hung, id, "reject");
        assertThat(withoutReason.getResponse().getStatus()).isBetween(400, 422);
        assertThat(integer(approvals(hung, ""), "$.total")).isEqualTo(1);

        MvcTestResult rejected = mvc.post().uri("/api/approvals/{id}/reject", id)
                .header(HttpHeaders.AUTHORIZATION, bearer(hung)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"comment\":\"Thiếu giấy tờ\"}").exchange();
        assertThat(rejected).hasStatusOk();
        assertThat(string(rejected, "$.status")).isEqualTo("REJECTED");
        assertThat(integer(approvals(hung, ""), "$.total")).isZero();
    }

    @Test
    void anAccountWithoutAnEmployeeHasAnEmptyBlock() {
        TestAccounts.TestAccount admin = testAccounts.create(Role.ADMIN);

        MvcTestResult dashboard = mvc.get().uri("/api/dashboard/approvals")
                .header(HttpHeaders.AUTHORIZATION, testAccounts.bearer(mvc, admin)).exchange();

        assertThat(dashboard).hasStatusOk();
        assertThat(integer(dashboard, "$.total")).isZero();
        assertThat(strings(dashboard, "$.items[*].request.id")).isEmpty();
    }

    // ------------------------------------------------------------------------------------------------- helpers

    void setAnnualEntitlement(String days) {
        jdbc.update("update leave_policy set entitlement_days = ?::numeric where leave_type_id = "
                + "(select id from leave_type where code = 'PN')", days);
    }

    LocalDate workingDay(DayOfWeek weekday) {
        LocalDate day = TODAY.plusDays(7);
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

    String request(String type, LocalDate day, String part, String attachment) {
        return """
                {"leaveTypeId": "%s", "startDate": "%s", "startPart": "%s", "endDate": "%s", "endPart": "%s",
                 "reason": null, "cc":[], "attachmentIds":[%s]}""".formatted(type, day, part, day, part,
                attachment == null ? "" : "\"" + attachment + "\"");
    }

    String submit(UUID employee, String json) {
        MvcTestResult sent = mvc.post().uri("/api/leave-requests").header(HttpHeaders.AUTHORIZATION, bearer(employee))
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
        assertThat(sent).hasStatus(201);
        return JsonPath.read(body(sent), "$.id");
    }

    MvcTestResult decide(UUID approver, UUID id, String action) {
        return mvc.post().uri("/api/approvals/{id}/{action}", id, action)
                .header(HttpHeaders.AUTHORIZATION, bearer(approver)).contentType(MediaType.APPLICATION_JSON)
                .content("{}").exchange();
    }

    MvcTestResult approvals(UUID employee, String query) {
        return mvc.get().uri("/api/dashboard/approvals" + query).header(HttpHeaders.AUTHORIZATION, bearer(employee))
                .exchange();
    }

    UUID unit(String code, String name) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into org_unit (id, legal_entity_id, parent_id, code, name, type, created_at, updated_at)
                values (?, (select id from legal_entity), null, ?, ?, 'TEAM', now(), now())""", id, code, name);
        return id;
    }

    /** Employees without a role of their own are plain Employees. */
    String bearer(UUID employee) {
        return signedIn(employee, Role.EMPLOYEE);
    }

    String signedIn(UUID employee, Role role) {
        TestAccounts.TestAccount account = accounts.computeIfAbsent(employee, id -> {
            TestAccounts.TestAccount created = testAccounts.create(role);
            testEmployees.link(created.id(), id);
            return created;
        });
        return testAccounts.bearer(mvc, account);
    }

    static String body(MvcTestResult result) {
        try {
            return result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    static String string(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }

    static int integer(MvcTestResult result, String path) {
        return ((Number) JsonPath.read(body(result), path)).intValue();
    }

    static List<String> strings(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }
}
