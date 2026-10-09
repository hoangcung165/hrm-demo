package com.hrmdemo.controller.approval;

import static org.assertj.core.api.Assertions.assertThat;

import javax.sql.DataSource;

import com.hrmdemo.dto.approval.ApprovalRequestType;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.service.approval.ApprovalFlow;
import com.hrmdemo.service.approval.ApprovalFlowService;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Luồng phê duyệt API against real PostgreSQL. Every test starts from the defaults. */
@IntegrationTest
class ApprovalFlowApiIT {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    DataSource dataSource;
    @Autowired
    ApprovalFlowService flows;

    String admin;

    @BeforeEach
    void setUp() {
        new JdbcTemplate(dataSource).update("delete from approval_flow_setting");
        admin = testAccounts.adminBearer(mvc);
    }

    @Test
    void everyCompanyStartsWithTheDrawnDefaults() {
        MvcTestResult list = get(admin);

        assertThat(list).hasStatusOk();
        assertThat(list).bodyJson().extractingPath("$.items[*].requestType").asArray().containsExactly(
                "PROFILE_UPDATE", "LEAVE", "OVERTIME", "ATTENDANCE_ADJUSTMENT", "TIMESHEET", "PAYROLL");
        assertThat(list).bodyJson().extractingPath("$.items[0].levels[*].rule").asArray()
                .containsExactly("LINE_MANAGER", "ROLE");
        assertThat(list).bodyJson().extractingPath("$.items[0].levels[1].role").isEqualTo("HR");
        assertThat(list).bodyJson().extractingPath("$.items[0].autoApproveDays").isEqualTo(3);
        assertThat(list).bodyJson().extractingPath("$.items[0].customized").isEqualTo(false);
        assertThat(list).bodyJson().extractingPath("$.items[2].autoApproveDays").isNull();
        assertThat(list).bodyJson().extractingPath("$.items[4].levels[0].rule").isEqualTo("PROJECT_MANAGER");
        assertThat(list).bodyJson().extractingPath("$.items[5].levels[*].role").asArray()
                .containsExactly("HR", "ACCOUNTANT", "DIRECTOR");
        assertThat(list).bodyJson().extractingPath("$.items[5].automationAllowed").isEqualTo(false);
        assertThat(list).bodyJson().extractingPath("$.items[5].delegationAllowed").isEqualTo(false);
    }

    @Test
    void aSavedFlowIsInForceForNewRequestsAndSavingTheDefaultAgainDropsIt() {
        MvcTestResult saved = put(admin, "LEAVE", """
                {"levels":[{"rule":"LINE_MANAGER"},{"rule":"ROLE","role":"HR"}],
                 "autoApproveDays":5,"delegationAllowed":false}""");

        assertThat(saved).hasStatusOk();
        assertThat(saved).bodyJson().extractingPath("$.customized").isEqualTo(true);
        assertThat(saved).bodyJson().extractingPath("$.updatedAt").isNotNull();
        assertThat(saved).bodyJson().extractingPath("$.levels[1].role").isEqualTo("HR");
        ApprovalFlow inForce = flows.flowOf(ApprovalRequestType.LEAVE);
        assertThat(inForce.levelCount()).isEqualTo(2);
        assertThat(inForce.autoApproveDays()).isEqualTo(5);
        assertThat(inForce.delegationAllowed()).isFalse();
        assertThat(get(admin)).bodyJson().extractingPath("$.items[1].customized").isEqualTo(true);

        // Saved twice: still one row, now with one level.
        put(admin, "LEAVE", """
                {"levels":[{"rule":"ROLE","role":"DIRECTOR"}],"autoApproveDays":null,"delegationAllowed":true}""");
        assertThat(rows()).isEqualTo(1);
        assertThat(flows.flowOf(ApprovalRequestType.LEAVE).level(1).role()).isEqualTo(Role.DIRECTOR);

        MvcTestResult reset = put(admin, "LEAVE", """
                {"levels":[{"rule":"LINE_MANAGER"}],"autoApproveDays":3,"delegationAllowed":true}""");
        assertThat(reset).bodyJson().extractingPath("$.customized").isEqualTo(false);
        assertThat(rows()).isZero();
    }

    @Test
    void theRulesOfAFlowAreCheckedWithTheirOwnCodes() {
        assertCode(put(admin, "LEAVE", """
                {"levels":[],"delegationAllowed":true}"""), "approval.flow_levels");
        assertCode(put(admin, "LEAVE", """
                {"levels":[{"rule":"LINE_MANAGER"},{"rule":"ROLE","role":"HR"},{"rule":"ROLE","role":"ACCOUNTANT"},
                 {"rule":"ROLE","role":"DIRECTOR"}],"delegationAllowed":true}"""), "approval.flow_levels");
        assertCode(put(admin, "LEAVE", """
                {"levels":[{"rule":"PROJECT_MANAGER"}],"delegationAllowed":true}"""),
                "approval.flow_project_manager_only_timesheet");
        assertCode(put(admin, "LEAVE", """
                {"levels":[{"rule":"LINE_MANAGER"}],"autoApproveDays":31,"delegationAllowed":true}"""),
                "approval.flow_auto_approve_days");
        assertCode(put(admin, "PAYROLL", """
                {"levels":[{"rule":"ROLE","role":"HR"}],"autoApproveDays":3,"delegationAllowed":false}"""),
                "approval.flow_payroll_auto_approve");
        assertCode(put(admin, "PAYROLL", """
                {"levels":[{"rule":"ROLE","role":"HR"}],"delegationAllowed":true}"""),
                "approval.flow_payroll_delegation");
        MvcTestResult noRole = put(admin, "LEAVE", """
                {"levels":[{"rule":"LINE_MANAGER"},{"rule":"ROLE"}],"delegationAllowed":true}""");
        assertCode(noRole, "approval.flow_role");
        assertThat(noRole).bodyJson().extractingPath("$.level").isEqualTo(2);
        assertCode(put(admin, "LEAVE", """
                {"levels":[{"rule":"ROLE","role":"EMPLOYEE"}],"delegationAllowed":true}"""), "approval.flow_role");
        assertCode(put(admin, "LEAVE", """
                {"levels":[{"rule":"LINE_MANAGER","role":"HR"}],"delegationAllowed":true}"""), "approval.flow_role");
        assertThat(put(admin, "SOMETHING", """
                {"levels":[{"rule":"LINE_MANAGER"}],"delegationAllowed":true}""")).hasStatus(400);
        assertThat(rows()).isZero();
    }

    @Test
    void withoutThePermissionTheFlowsCannotBeReadOrChanged() {
        String hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));

        assertCode403(get(hr));
        assertCode403(put(hr, "LEAVE", """
                {"levels":[{"rule":"LINE_MANAGER"}],"autoApproveDays":1,"delegationAllowed":true}"""));
        assertThat(rows()).isZero();
        assertThat(mvc.get().uri("/api/approval-flows").exchange()).hasStatus(401);
    }

    MvcTestResult get(String bearer) {
        return mvc.get().uri("/api/approval-flows").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    MvcTestResult put(String bearer, String type, String body) {
        return mvc.put().uri("/api/approval-flows/{type}", type).header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
    }

    int rows() {
        return new JdbcTemplate(dataSource).queryForObject("select count(*) from approval_flow_setting",
                Integer.class);
    }

    static void assertCode(MvcTestResult result, String code) {
        assertThat(result).hasStatus(400);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo(code);
    }

    static void assertCode403(MvcTestResult result) {
        assertThat(result).hasStatus(403);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
    }
}
