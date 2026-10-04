package com.hrmdemo.controller.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
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
                .containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW", "ORG_VIEW", "ORG_EDIT");

        MvcTestResult director = me(testAccounts.bearer(mvc, testAccounts.create(Role.DIRECTOR)));
        assertThat(director).bodyJson().extractingPath("$.permissions").asArray()
                .containsExactly("COMPANY_VIEW", "ACCOUNT_VIEW", "ORG_VIEW");

        MvcTestResult admin = me(testAccounts.adminBearer(mvc));
        assertThat(admin).bodyJson().extractingPath("$.dataScope").isEqualTo("COMPANY");
        assertThat(admin).bodyJson().extractingPath("$.permissions").asArray()
                .containsExactly("COMPANY_VIEW", "COMPANY_EDIT", "ACCOUNT_VIEW", "ORG_VIEW", "ORG_EDIT");
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
