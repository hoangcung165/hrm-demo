package com.hrmdemo.controller.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Editable role permissions against real PostgreSQL. The stored changes apply to every Account of the company,
 * so each test starts and ends with none: the other test classes rely on the default permissions.
 */
@IntegrationTest
class RolePermissionApiIT {

    static final String HR_DEFAULTS = "[\"COMPANY_VIEW\",\"ACCOUNT_VIEW\",\"ORG_VIEW\",\"ORG_EDIT\","
            + "\"EMPLOYEE_VIEW\",\"EMPLOYEE_EDIT\",\"EMPLOYEE_SENSITIVE_VIEW\",\"PROJECT_VIEW\",\"RESOURCE_VIEW\","
            + "\"LEAVE_POLICY_EDIT\",\"SHIFT_VIEW\",\"SHIFT_EDIT\",\"SHIFT_ASSIGN\",\"ATTENDANCE_VIEW\",\"ATTENDANCE_IMPORT\"]";

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    DataSource dataSource;
    @Autowired
    PlatformTransactionManager transactionManager;

    JdbcTemplate jdbc;
    String admin;
    /** Signed in once per test; the same token is used before and after a change. */
    String hr;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        removeChanges();
        admin = testAccounts.adminBearer(mvc);
        hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));
    }

    @AfterEach
    void removeChanges() {
        new JdbcTemplate(dataSource).update("delete from role_permission_override");
    }

    // --- the matrix ---

    @Test
    void withoutChangesTheMatrixShowsTheDefaultsAndWhatIsLocked() {
        MvcTestResult matrix = get(admin, "/api/roles");

        assertThat(matrix).hasStatusOk();
        assertThat(matrix).bodyJson().extractingPath("$.customized").isEqualTo(false);
        assertThat(strings(matrix, "$.roles[*].role")).containsExactly("ADMIN", "HR", "LINE_MANAGER",
                "PROJECT_MANAGER", "ACCOUNTANT", "DIRECTOR", "EMPLOYEE");
        assertThat(strings(matrix, "$.roles[0].permissions[*]")).containsExactly("COMPANY_VIEW", "COMPANY_EDIT",
                "ACCOUNT_VIEW", "ACCOUNT_LIST", "ACCOUNT_EDIT", "ORG_VIEW", "ORG_EDIT", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT",
                "EMPLOYEE_SENSITIVE_VIEW", "CATALOG_EDIT", "APPROVAL_FLOW_EDIT", "PROJECT_VIEW",
                        "PROJECT_EDIT", "PROJECT_EDIT_ALL", "RESOURCE_VIEW", "RESOURCE_EDIT", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT", "AUDIT_VIEW");
        assertThat(strings(matrix, "$.roles[1].permissions[*]")).containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW",
                "ORG_VIEW", "ORG_EDIT", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT", "EMPLOYEE_SENSITIVE_VIEW", "PROJECT_VIEW", "RESOURCE_VIEW", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT");
        assertThat(matrix).bodyJson().extractingPath("$.roles[0].locked").isEqualTo("ADMIN_ALL");
        assertThat(JsonPath.<Object>read(body(matrix), "$.roles[1].locked")).isNull();
        assertThat(strings(matrix, "$.permissions[?(@.locked == 'BASE')].permission"))
                .containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW");
        assertThat(matrix).bodyJson().extractingPath("$.permissions[4].permission").isEqualTo("ACCOUNT_EDIT");
        assertThat(matrix).bodyJson().extractingPath("$.permissions[4].requires").isEqualTo("ACCOUNT_LIST");
        assertThat(matrix).bodyJson().extractingPath("$.permissions[6].requires").isEqualTo("ORG_VIEW");
        assertThat(matrix).bodyJson().extractingPath("$.permissions[1].requires").isEqualTo("COMPANY_VIEW");
        assertThat(JsonPath.<Object>read(body(matrix), "$.permissions[3].requires")).isNull();
        assertThat(matrix).bodyJson().extractingPath("$.permissions[8].permission").isEqualTo("EMPLOYEE_EDIT");
        assertThat(matrix).bodyJson().extractingPath("$.permissions[8].requires").isEqualTo("EMPLOYEE_VIEW");
        assertThat(matrix).bodyJson().extractingPath("$.permissions[9].requires").isEqualTo("EMPLOYEE_VIEW");
        assertThat(matrix).bodyJson().extractingPath("$.permissions[9].group").isEqualTo("EMPLOYEE");
        assertThat(matrix).bodyJson().extractingPath("$.permissions[3].group").isEqualTo("ACCOUNT");
    }

    // --- a change applies at the next request ---

    @Test
    void aRoleThatGainsAPermissionCanUseItAtItsNextRequestWithTheSameToken() {
        assertThat(get(hr, "/api/accounts")).hasStatus(403);

        MvcTestResult saved = save(admin, """
                {"roles":[{"role":"HR",
                           "permissions":["COMPANY_VIEW","ACCOUNT_VIEW","ACCOUNT_LIST","ORG_VIEW","ORG_EDIT"]}]}""");

        assertThat(saved).hasStatusOk();
        assertThat(saved).bodyJson().extractingPath("$.customized").isEqualTo(true);
        assertThat(strings(saved, "$.roles[1].permissions[*]"))
                .containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW", "ACCOUNT_LIST", "ORG_VIEW", "ORG_EDIT");
        // Not signed in again: the token only carries the role.
        assertThat(get(hr, "/api/accounts")).hasStatusOk();
        assertThat(strings(get(hr, "/api/me"), "$.permissions[*]"))
                .containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW", "ACCOUNT_LIST", "ORG_VIEW", "ORG_EDIT");
        assertThat(get(hr, "/api/roles")).as("the matrix needs the same permission").hasStatusOk();
        // Listing is not editing.
        assertThat(save(hr, "{\"roles\":[]}")).hasStatus(403);
    }

    @Test
    void aRoleThatLosesAPermissionIsRefusedAtItsNextRequestWithTheSameToken() {
        MvcTestResult saved = save(admin, """
                {"roles":[{"role":"HR","permissions":["ORG_VIEW"]}]}""");

        assertThat(saved).hasStatusOk();
        assertThat(strings(saved, "$.roles[1].permissions[*]"))
                .containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW", "ORG_VIEW");
        MvcTestResult write = mvc.post().uri("/api/org-units").header(HttpHeaders.AUTHORIZATION, hr)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"Never created","code":"ZZ-NEVER","type":"TEAM","parentId":null,
                         "headEmployeeId":null}""")
                .exchange();
        assertThat(write).hasStatus(403);
        assertThat(write).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
        assertThat(get(hr, "/api/org-units")).as("the view stays").hasStatusOk();
        assertThat(strings(get(hr, "/api/me"), "$.permissions[*]"))
                .containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW", "ORG_VIEW");
        assertThat(jdbc.queryForObject("select count(*) from org_unit where code = 'ZZ-NEVER'", Long.class))
                .isZero();
    }

    @Test
    void theAdminIsNotAffectedByAnyChange() {
        save(admin, """
                {"roles":[{"role":"HR","permissions":[]},{"role":"DIRECTOR","permissions":[]}]}""");

        assertThat(strings(get(admin, "/api/me"), "$.permissions[*]")).containsExactly("COMPANY_VIEW",
                "COMPANY_EDIT", "ACCOUNT_VIEW", "ACCOUNT_LIST", "ACCOUNT_EDIT", "ORG_VIEW", "ORG_EDIT", "EMPLOYEE_VIEW",
                "EMPLOYEE_EDIT", "EMPLOYEE_SENSITIVE_VIEW", "CATALOG_EDIT", "APPROVAL_FLOW_EDIT", "PROJECT_VIEW",
                        "PROJECT_EDIT", "PROJECT_EDIT_ALL", "RESOURCE_VIEW", "RESOURCE_EDIT", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT", "AUDIT_VIEW");
    }

    @Test
    void aRoleThatIsLeftOutKeepsItsPermissionsAndOnlyDifferencesAreStored() {
        save(admin, """
                {"roles":[{"role":"DIRECTOR","permissions":["ORG_VIEW","ACCOUNT_LIST","EMPLOYEE_VIEW","PROJECT_VIEW",
                 "PROJECT_EDIT","PROJECT_EDIT_ALL","RESOURCE_VIEW","RESOURCE_EDIT","SHIFT_VIEW","AUDIT_VIEW"]}]}""");

        MvcTestResult second = save(admin, """
                {"roles":[{"role":"HR",
                           "permissions":["ORG_VIEW","EMPLOYEE_VIEW","EMPLOYEE_EDIT","EMPLOYEE_SENSITIVE_VIEW",
                            "PROJECT_VIEW","RESOURCE_VIEW","LEAVE_POLICY_EDIT","SHIFT_VIEW","SHIFT_EDIT","SHIFT_ASSIGN","ATTENDANCE_VIEW","ATTENDANCE_IMPORT"]}]}""");

        assertThat(strings(second, "$.roles[5].permissions[*]"))
                .containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW", "ACCOUNT_LIST", "ORG_VIEW", "EMPLOYEE_VIEW", "PROJECT_VIEW",
                        "PROJECT_EDIT", "PROJECT_EDIT_ALL", "RESOURCE_VIEW", "RESOURCE_EDIT", "SHIFT_VIEW", "ATTENDANCE_VIEW", "AUDIT_VIEW");
        assertThat(storedRows()).containsExactly("DIRECTOR ACCOUNT_LIST true", "HR ORG_EDIT false");
    }

    // --- restore defaults ---

    @Test
    void resetRestoresTheDefaultsForEveryone() {
        save(admin, """
                {"roles":[{"role":"HR","permissions":["ACCOUNT_LIST"]},
                          {"role":"EMPLOYEE","permissions":["ORG_VIEW"]}]}""");
        assertThat(get(hr, "/api/accounts")).hasStatusOk();

        MvcTestResult reset = mvc.post().uri("/api/roles/reset").header(HttpHeaders.AUTHORIZATION, admin).exchange();

        assertThat(reset).hasStatusOk();
        assertThat(reset).bodyJson().extractingPath("$.customized").isEqualTo(false);
        assertThat(strings(reset, "$.roles[1].permissions[*]")).containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW",
                "ORG_VIEW", "ORG_EDIT", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT", "EMPLOYEE_SENSITIVE_VIEW", "PROJECT_VIEW", "RESOURCE_VIEW", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT");
        assertThat(strings(reset, "$.roles[6].permissions[*]")).containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW");
        assertThat(storedRows()).isEmpty();
        assertThat(get(hr, "/api/accounts")).hasStatus(403);
        assertThat(strings(get(hr, "/api/me"), "$.permissions[*]")).containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW",
                "ORG_VIEW", "ORG_EDIT", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT", "EMPLOYEE_SENSITIVE_VIEW", "PROJECT_VIEW", "RESOURCE_VIEW", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT");
        // Again, with nothing to restore.
        assertThat(mvc.post().uri("/api/roles/reset").header(HttpHeaders.AUTHORIZATION, admin)).hasStatusOk();
    }

    @Test
    void savingTheDefaultsAgainMeansNotCustomized() {
        save(admin, """
                {"roles":[{"role":"HR","permissions":["ORG_VIEW"]}]}""");

        MvcTestResult back = save(admin, "{\"roles\":[{\"role\":\"HR\",\"permissions\":" + HR_DEFAULTS + "}]}");

        assertThat(back).bodyJson().extractingPath("$.customized").isEqualTo(false);
        assertThat(storedRows()).isEmpty();
    }

    // --- refusals ---

    @Test
    void theAdminRoleCannotLoseAPermissionButMayBeListedUnchanged() {
        MvcTestResult refused = save(admin, """
                {"roles":[{"role":"ADMIN",
                           "permissions":["COMPANY_EDIT","ACCOUNT_LIST","ACCOUNT_EDIT","ORG_VIEW"]}]}""");
        assertThat(refused).hasStatus(409);
        assertThat(refused).bodyJson().extractingPath("$.code").isEqualTo("role_permission.role_locked");
        assertThat(refused).bodyJson().extractingPath("$.role").isEqualTo("ADMIN");

        MvcTestResult unchanged = save(admin, """
                {"roles":[{"role":"ADMIN","permissions":["COMPANY_VIEW","COMPANY_EDIT","ACCOUNT_VIEW","ACCOUNT_LIST",
                 "ACCOUNT_EDIT","ORG_VIEW","ORG_EDIT","EMPLOYEE_VIEW","EMPLOYEE_EDIT","EMPLOYEE_SENSITIVE_VIEW",
                 "CATALOG_EDIT","APPROVAL_FLOW_EDIT","PROJECT_VIEW","PROJECT_EDIT","PROJECT_EDIT_ALL","RESOURCE_VIEW","RESOURCE_EDIT","LEAVE_POLICY_EDIT","SHIFT_VIEW","SHIFT_EDIT","SHIFT_ASSIGN","ATTENDANCE_VIEW","ATTENDANCE_IMPORT","AUDIT_VIEW"]}]}""");
        assertThat(unchanged).hasStatusOk();
        assertThat(unchanged).bodyJson().extractingPath("$.customized").isEqualTo(false);
    }

    @Test
    void anEditPermissionWithoutItsViewIsRefusedAndNothingOfTheRequestIsSaved() {
        MvcTestResult refused = save(admin, """
                {"roles":[{"role":"DIRECTOR","permissions":["ORG_VIEW","ACCOUNT_LIST"]},
                          {"role":"HR","permissions":["ORG_EDIT"]}]}""");

        assertThat(refused).hasStatus(409);
        assertThat(refused).bodyJson().extractingPath("$.code").isEqualTo("role_permission.dependency_missing");
        assertThat(refused).bodyJson().extractingPath("$.role").isEqualTo("HR");
        assertThat(refused).bodyJson().extractingPath("$.permission").isEqualTo("ORG_EDIT");
        assertThat(refused).bodyJson().extractingPath("$.requires").isEqualTo("ORG_VIEW");
        // All or nothing: the Director's valid change did not go through either.
        assertThat(storedRows()).isEmpty();
        assertThat(get(admin, "/api/roles")).bodyJson().extractingPath("$.customized").isEqualTo(false);

        MvcTestResult accounts = save(admin, """
                {"roles":[{"role":"HR","permissions":["ACCOUNT_EDIT","ORG_VIEW","ORG_EDIT"]}]}""");
        assertThat(accounts).hasStatus(409);
        assertThat(accounts).bodyJson().extractingPath("$.permission").isEqualTo("ACCOUNT_EDIT");
        assertThat(accounts).bodyJson().extractingPath("$.requires").isEqualTo("ACCOUNT_LIST");
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "roles | {}",
        "roles[0].role | {\"roles\":[{\"role\":\"BOSS\",\"permissions\":[\"ORG_VIEW\"]}]}",
        "roles[0].role | {\"roles\":[{\"permissions\":[\"ORG_VIEW\"]}]}",
        "roles[1].role | {\"roles\":[{\"role\":\"HR\",\"permissions\":[\"ORG_VIEW\"]},"
                + "{\"role\":\"HR\",\"permissions\":[\"ORG_VIEW\"]}]}",
        "roles[0].permissions | {\"roles\":[{\"role\":\"HR\",\"permissions\":[\"ORG_VIEW\",\"PAYROLL_APPROVE\"]}]}",
        "roles[0].permissions | {\"roles\":[{\"role\":\"HR\"}]}"})
    void anInvalidRequestNamesTheFieldAndSavesNothing(String field, String json) {
        MvcTestResult result = save(admin, json);

        assertThat(result).hasStatus(400);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo(field);
        assertThat(storedRows()).isEmpty();
    }

    @Test
    void onlyAnAccountThatMayEditAccountsChangesOrResetsRolePermissions() {
        MvcTestResult save = save(hr, """
                {"roles":[{"role":"HR","permissions":["ACCOUNT_LIST","ACCOUNT_EDIT","ORG_VIEW","ORG_EDIT"]}]}""");
        assertThat(save).hasStatus(403);
        assertThat(save).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
        MvcTestResult reset = mvc.post().uri("/api/roles/reset").header(HttpHeaders.AUTHORIZATION, hr).exchange();
        assertThat(reset).hasStatus(403);
        assertThat(storedRows()).isEmpty();

        assertThat(mvc.put().uri("/api/roles/permissions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"roles\":[]}")).as("signed out").hasStatus(401);
        assertThat(mvc.post().uri("/api/roles/reset")).as("signed out").hasStatus(401);
    }

    // --- one company's changes are its own ---

    @Test
    void theChangesOfAnotherLegalEntityDoNotApplyHereAndAreNotRemovedByAResetHere() {
        // A second Legal entity can only exist without the single-row index. DDL is transactional in PostgreSQL,
        // so everything here is rolled back (same approach as LegalEntityIT and OrgUnitApiIT).
        var transaction = new TransactionTemplate(transactionManager);
        transaction.executeWithoutResult(status -> {
            status.setRollbackOnly();
            UUID otherLegalEntity = UUID.randomUUID();
            jdbc.execute("drop index uq_legal_entity_single");
            jdbc.update("insert into legal_entity (id, name, created_at, updated_at) "
                    + "values (?, 'Another', now(), now())", otherLegalEntity);
            jdbc.update("""
                    insert into role_permission_override (id, legal_entity_id, role, permission, granted)
                    values (?, ?, 'HR', 'ACCOUNT_LIST', true), (?, ?, 'HR', 'ORG_EDIT', false)""",
                    UUID.randomUUID(), otherLegalEntity, UUID.randomUUID(), otherLegalEntity);

            assertThat(get(hr, "/api/accounts")).as("not granted here").hasStatus(403);
            assertThat(strings(get(hr, "/api/me"), "$.permissions[*]")).containsExactly("COMPANY_VIEW",
                    "ACCOUNT_VIEW", "ORG_VIEW", "ORG_EDIT", "EMPLOYEE_VIEW", "EMPLOYEE_EDIT", "EMPLOYEE_SENSITIVE_VIEW", "PROJECT_VIEW", "RESOURCE_VIEW", "LEAVE_POLICY_EDIT", "SHIFT_VIEW", "SHIFT_EDIT", "SHIFT_ASSIGN", "ATTENDANCE_VIEW", "ATTENDANCE_IMPORT");
            assertThat(get(admin, "/api/roles")).bodyJson().extractingPath("$.customized").isEqualTo(false);

            // A change and a reset here touch only this company's rows.
            assertThat(save(admin, """
                    {"roles":[{"role":"HR","permissions":["ORG_VIEW"]}]}""")).hasStatusOk();
            assertThat(mvc.post().uri("/api/roles/reset").header(HttpHeaders.AUTHORIZATION, admin)).hasStatusOk();
            assertThat(jdbc.queryForObject("select count(*) from role_permission_override where legal_entity_id = ?",
                    Long.class, otherLegalEntity)).isEqualTo(2);
            assertThat(jdbc.queryForObject("select count(*) from role_permission_override", Long.class))
                    .isEqualTo(2);
        });
    }

    // --- helpers ---

    private MvcTestResult get(String bearer, String path) {
        return mvc.get().uri(path).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    private MvcTestResult save(String bearer, String json) {
        return mvc.put().uri("/api/roles/permissions").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    /** The stored rows as "ROLE PERMISSION granted", in a fixed order. */
    private List<String> storedRows() {
        return jdbc.queryForList("select role || ' ' || permission || ' ' || granted from role_permission_override "
                + "order by role, permission", String.class);
    }

    private static List<String> strings(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
