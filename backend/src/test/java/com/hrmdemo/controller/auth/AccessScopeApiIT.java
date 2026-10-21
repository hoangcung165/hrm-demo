package com.hrmdemo.controller.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.orgunit.OrgUnitType;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Phạm vi truy cập through the API: an Employee reads only their own record, HR reads everyone's. */
@IntegrationTest
class AccessScopeApiIT {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    TestEmployees testEmployees;
    @Autowired
    OrgUnitRepository orgUnits;

    final List<OrgUnit> savedUnits = new ArrayList<>();

    @AfterEach
    void removeUnits() {
        // Employees first: they are unit heads and members.
        testEmployees.deleteAll();
        // One statement, so a parent and its child units go together.
        orgUnits.deleteAllInBatch(savedUnits);
    }

    @Test
    void anEmployeeCannotReadAnotherPersonsRecord() {
        TestAccount employee = testAccounts.create(Role.EMPLOYEE);
        TestAccount colleague = testAccounts.create(Role.EMPLOYEE);

        MvcTestResult result = getAccount(employee, colleague.id());

        assertThat(result).hasStatus(403);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
        assertThat(body(result)).doesNotContain(colleague.email());
    }

    @Test
    void anEmployeeGetsTheSameAnswerForAnAccountThatDoesNotExist() {
        TestAccount employee = testAccounts.create(Role.EMPLOYEE);

        assertThat(getAccount(employee, UUID.randomUUID())).hasStatus(403);
    }

    @Test
    void anEmployeeReadsTheirOwnRecord() {
        TestAccount employee = testAccounts.create(Role.EMPLOYEE);

        MvcTestResult result = getAccount(employee, employee.id());

        assertThat(result).hasStatusOk();
        assertThat(result).bodyJson().extractingPath("$.id").isEqualTo(employee.id().toString());
        assertThat(result).bodyJson().extractingPath("$.email").isEqualTo(employee.email());
        assertThat(result).bodyJson().extractingPath("$.roles").asArray().containsExactly("EMPLOYEE");
        assertThat(result).bodyJson().extractingPath("$.status").isEqualTo("ACTIVE");
        assertThat(body(result)).doesNotContain("password");
    }

    @Test
    void hrReadsAnotherPersonsRecord() {
        TestAccount hr = testAccounts.create(Role.HR);
        TestAccount employee = testAccounts.create(Role.EMPLOYEE);

        MvcTestResult result = getAccount(hr, employee.id());

        assertThat(result).hasStatusOk();
        assertThat(result).bodyJson().extractingPath("$.email").isEqualTo(employee.email());
    }

    @Test
    void hrGetsNotFoundForAnAccountThatDoesNotExist() {
        MvcTestResult result = getAccount(testAccounts.create(Role.HR), UUID.randomUUID());

        assertThat(result).hasStatus(404);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("account.not_found");
    }

    @Test
    void readingAnAccountNeedsSignIn() {
        assertThat(mvc.get().uri("/api/accounts/{id}", UUID.randomUUID())).hasStatus(401);
    }

    @Test
    void meReturnsSelfScopeForAnEmployee() {
        TestAccount employee = testAccounts.create(Role.EMPLOYEE);

        MvcTestResult me = me(testAccounts.bearer(mvc, employee));

        assertThat(me).hasStatusOk();
        assertThat(me).bodyJson().extractingPath("$.email").isEqualTo(employee.email());
        assertThat(me).bodyJson().extractingPath("$.roles").asArray().containsExactly("EMPLOYEE");
        assertThat(me).bodyJson().extractingPath("$.dataScope").isEqualTo("SELF");
        assertThat(me).bodyJson().extractingPath("$.permissions").asArray()
                .containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW");
    }

    @Test
    void meReturnsCompanyScopeForHrAndTheEditPermissionOnlyForTheAdmin() {
        MvcTestResult hr = me(testAccounts.bearer(mvc, testAccounts.create(Role.HR, Role.EMPLOYEE)));
        assertThat(hr).bodyJson().extractingPath("$.dataScope").isEqualTo("COMPANY");
        assertThat(hr).bodyJson().extractingPath("$.permissions").asArray()
                .containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW", "ORG_VIEW", "ORG_EDIT", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT",
                        "EMPLOYEE_SENSITIVE_VIEW", "PROJECT_VIEW", "RESOURCE_VIEW", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT");

        MvcTestResult director = me(testAccounts.bearer(mvc, testAccounts.create(Role.DIRECTOR)));
        assertThat(director).bodyJson().extractingPath("$.permissions").asArray()
                .containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW", "ORG_VIEW", "EMPLOYEE_VIEW", "PROJECT_VIEW",
                        "PROJECT_EDIT", "PROJECT_EDIT_ALL", "RESOURCE_VIEW", "RESOURCE_EDIT", "SHIFT_VIEW", "ATTENDANCE_VIEW", "AUDIT_VIEW");

        MvcTestResult admin = me(testAccounts.adminBearer(mvc));
        assertThat(admin).bodyJson().extractingPath("$.dataScope").isEqualTo("COMPANY");
        assertThat(admin).bodyJson().extractingPath("$.permissions").asArray()
                .containsExactly("COMPANY_VIEW", "COMPANY_EDIT", "ACCOUNT_VIEW", "ACCOUNT_LIST", "ACCOUNT_EDIT",
                        "ORG_VIEW", "ORG_EDIT", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT", "EMPLOYEE_SENSITIVE_VIEW",
                        "CATALOG_EDIT", "APPROVAL_FLOW_EDIT", "PROJECT_VIEW",
                        "PROJECT_EDIT", "PROJECT_EDIT_ALL", "RESOURCE_VIEW", "RESOURCE_EDIT", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT", "AUDIT_VIEW");
    }

    @Test
    void meShowsNoUnitsAndNoEmployeeForAnAccountThatIsNotLinkedToAnEmployee() {
        MvcTestResult me = me(testAccounts.bearer(mvc, testAccounts.create(Role.LINE_MANAGER)));

        assertThat(me).hasStatusOk();
        assertThat(me).bodyJson().extractingPath("$.dataScope").isEqualTo("ORG_UNIT");
        assertThat(me).bodyJson().extractingPath("$.orgUnitIds").asArray().isEmpty();
        assertThat(JsonPath.<Object>read(body(me), "$.employeeId")).isNull();
    }

    @Test
    void meShowsALineManagerTheUnitsTheirEmployeeHeadsAndTheUnitsBelow() {
        UUID employeeId = testEmployees.create("Lê Minh Quân", null);
        OrgUnit department = saveUnit(null, employeeId);
        OrgUnit team = saveUnit(department.getId(), null);
        saveUnit(null, testEmployees.create("Phạm Thu Hà", null));
        TestAccount manager = testAccounts.create(Role.LINE_MANAGER, Role.EMPLOYEE);
        linkToEmployee(manager, employeeId);

        MvcTestResult me = me(testAccounts.bearer(mvc, manager));

        assertThat(me).hasStatusOk();
        assertThat(me).bodyJson().extractingPath("$.dataScope").isEqualTo("ORG_UNIT");
        assertThat(me).bodyJson().extractingPath("$.employeeId").isEqualTo(employeeId.toString());
        assertThat(me).bodyJson().extractingPath("$.orgUnitIds").asArray()
                .containsExactlyInAnyOrder(department.getId().toString(), team.getId().toString());
        assertThat(me).bodyJson().extractingPath("$.permissions").asArray()
                .containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW", "EMPLOYEE_VIEW", "PROJECT_VIEW", "SHIFT_VIEW",
                        "SHIFT_ASSIGN", "ATTENDANCE_VIEW");
    }

    @Test
    void meShowsAnEmployeeWhoHeadsAUnitNoUnitsWithoutTheLineManagerRole() {
        UUID employeeId = testEmployees.create("Lê Minh Quân", null);
        saveUnit(null, employeeId);
        TestAccount employee = testAccounts.create(Role.EMPLOYEE);
        linkToEmployee(employee, employeeId);

        MvcTestResult me = me(testAccounts.bearer(mvc, employee));

        assertThat(me).bodyJson().extractingPath("$.dataScope").isEqualTo("SELF");
        assertThat(me).bodyJson().extractingPath("$.employeeId").isEqualTo(employeeId.toString());
        assertThat(me).bodyJson().extractingPath("$.orgUnitIds").asArray().isEmpty();
    }

    @Test
    void theAdminReadsTheRoleMatrix() {
        MvcTestResult roles = mvc.get().uri("/api/roles")
                .header(HttpHeaders.AUTHORIZATION, testAccounts.adminBearer(mvc))
                .exchange();

        assertThat(roles).hasStatusOk();
        assertThat(roles).bodyJson().extractingPath("$.roles[*].role").asArray()
                .containsExactly("ADMIN", "HR", "LINE_MANAGER", "PROJECT_MANAGER", "ACCOUNTANT", "DIRECTOR",
                        "EMPLOYEE");
        assertThat(roles).bodyJson().extractingPath("$.roles[*].dataScope").asArray()
                .containsExactly("COMPANY", "COMPANY", "ORG_UNIT", "SELF", "COMPANY", "COMPANY", "SELF");
        assertThat(roles).bodyJson().extractingPath("$.roles[0].permissions").asArray()
                .containsExactly("COMPANY_VIEW", "COMPANY_EDIT", "ACCOUNT_VIEW", "ACCOUNT_LIST", "ACCOUNT_EDIT",
                        "ORG_VIEW", "ORG_EDIT", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT", "EMPLOYEE_SENSITIVE_VIEW",
                        "CATALOG_EDIT", "APPROVAL_FLOW_EDIT", "PROJECT_VIEW",
                        "PROJECT_EDIT", "PROJECT_EDIT_ALL", "RESOURCE_VIEW", "RESOURCE_EDIT", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT", "AUDIT_VIEW");
        assertThat(roles).bodyJson().extractingPath("$.roles[2].permissions").asArray()
                .containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW", "EMPLOYEE_VIEW", "PROJECT_VIEW", "SHIFT_VIEW",
                        "SHIFT_ASSIGN", "ATTENDANCE_VIEW");
        assertThat(roles).bodyJson().extractingPath("$.permissions[*].permission").asArray()
                .containsExactly("COMPANY_VIEW", "COMPANY_EDIT", "ACCOUNT_VIEW", "ACCOUNT_LIST", "ACCOUNT_EDIT",
                        "ORG_VIEW", "ORG_EDIT", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT", "EMPLOYEE_SENSITIVE_VIEW",
                        "CATALOG_EDIT", "APPROVAL_FLOW_EDIT", "PROJECT_VIEW",
                        "PROJECT_EDIT", "PROJECT_EDIT_ALL", "RESOURCE_VIEW", "RESOURCE_EDIT", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT", "AUDIT_VIEW");
        assertThat(roles).bodyJson().extractingPath("$.permissions[*].group").asArray()
                .containsExactly("COMPANY", "COMPANY", "ACCOUNT", "ACCOUNT", "ACCOUNT", "ORG", "ORG", "EMPLOYEE",
                        "EMPLOYEE", "EMPLOYEE", "CATALOG", "APPROVAL", "PROJECT", "PROJECT", "PROJECT", "RESOURCE", "RESOURCE", "TIME",
                        "TIME", "TIME", "TIME", "AUDIT");
    }

    @Test
    void hrCannotReadTheRoleMatrix() {
        MvcTestResult roles = mvc.get().uri("/api/roles")
                .header(HttpHeaders.AUTHORIZATION, testAccounts.bearer(mvc, testAccounts.create(Role.HR)))
                .exchange();

        assertThat(roles).hasStatus(403);
        assertThat(roles).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
    }

    @Test
    void theRoleMatrixNeedsSignIn() {
        assertThat(mvc.get().uri("/api/roles")).hasStatus(401);
    }

    /** A unit with a code no other test uses; removed again after the test. */
    private OrgUnit saveUnit(UUID parentId, UUID headEmployeeId) {
        String code = "T" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        OrgUnit unit = orgUnits.save(
                new OrgUnit(parentId, code, "Unit " + code, OrgUnitType.DEPARTMENT, headEmployeeId, 0, Instant.now()));
        savedUnits.add(unit);
        return unit;
    }

    /** Stands in for the Account form: the API does not accept an Employee yet. */
    private void linkToEmployee(TestAccount account, UUID employeeId) {
        testEmployees.link(account.id(), employeeId);
    }

    private MvcTestResult getAccount(TestAccount caller, UUID id) {
        return mvc.get().uri("/api/accounts/{id}", id)
                .header(HttpHeaders.AUTHORIZATION, testAccounts.bearer(mvc, caller))
                .exchange();
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }

    private MvcTestResult me(String bearer) {
        return mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }
}
