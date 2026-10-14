package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** HRM-08 records persistence, CRUD, default payout account, permissions and date validation. */
@IntegrationTest
class EmployeeRecordsApiIT {
    @Autowired MockMvcTester mvc;
    @Autowired TestEmployees employees;
    @Autowired TestAccounts accounts;

    private UUID employeeId;
    private String hr;
    private String director;

    @BeforeEach
    void setup() {
        employees.deleteAll();
        employeeId = employees.create("Test Employee", null);
        hr = accounts.bearer(mvc, accounts.create(Role.HR));
        director = accounts.bearer(mvc, accounts.create(Role.DIRECTOR));
    }

    @AfterEach
    void cleanup() {
        employees.deleteAll();
    }

    private MvcTestResult post(String token, String path, String content) {
        return mvc.post().uri(path).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(content).exchange();
    }

    private MvcTestResult put(String token, String path, String content) {
        return mvc.put().uri(path).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(content).exchange();
    }

    private String url(String suffix) { return "/api/employees/" + employeeId + "/" + suffix; }
    private String bank(String name, boolean standard) {
        return "{\"bankName\":\"" + name + "\",\"accountNumber\":\"1234567890\",\"accountHolder\":\"Test Employee\",\"defaultAccount\":" + standard + "}";
    }

    @Test
    void bankDefaultMovesAndDeletePromotesRemainingAccount() {
        MvcTestResult first = post(hr, url("bank-accounts"), bank("First", false));
        assertThat(first).hasStatus(201);
        assertThat(first).bodyJson().extractingPath("$.defaultAccount").isEqualTo(true);
        String id1 = JsonPath.read(content(first), "$.id");
        MvcTestResult second = post(hr, url("bank-accounts"), bank("Second", true));
        assertThat(second).hasStatus(201);
        String id2 = JsonPath.read(content(second), "$.id");
        assertThat(second).bodyJson().extractingPath("$.defaultAccount").isEqualTo(true);
        assertThat(mvc.get().uri(url("bank-accounts")).header("Authorization", hr).exchange())
                .bodyJson().extractingPath("$[0].defaultAccount").isEqualTo(false);
        assertThat(put(hr, url("bank-accounts/" + id2), bank("Second", false))).hasStatus(409);
        assertThat(mvc.delete().uri(url("bank-accounts/" + id2)).header("Authorization", hr).exchange())
                .hasStatus(204);
        assertThat(mvc.get().uri(url("bank-accounts")).header("Authorization", hr).exchange())
                .bodyJson().extractingPath("$[0].defaultAccount").isEqualTo(true);
        assertThat(id1).isNotBlank();
    }

    @Test
    void dependentDatesAndPermissions() {
        String value = "{\"fullName\":\"Child\",\"relationship\":\"Child\",\"effectiveFrom\":\"2026-01-01\",\"effectiveTo\":\"2026-12-31\"}";
        MvcTestResult created = post(hr, url("dependents"), value);
        assertThat(created).hasStatus(201);
        String id = JsonPath.read(content(created), "$.id");
        assertThat(put(hr, url("dependents/" + id), value.replace("2026-12-31", "2025-12-31")))
                .hasStatus(400);
        assertThat(post(director, url("dependents"), value)).hasStatus(403);
        assertThat(mvc.get().uri(url("dependents")).header("Authorization", director).exchange()).hasStatusOk();
        assertThat(mvc.delete().uri(url("dependents/" + id)).header("Authorization", hr).exchange())
                .hasStatus(204);
    }

    @Test
    void sensitiveBankAccountsAreMaskedForDirectorAndMayNotBeEdited() {
        assertThat(post(hr, url("bank-accounts"), bank("First", false))).hasStatus(201);
        MvcTestResult response = mvc.get().uri(url("bank-accounts")).header("Authorization", director).exchange();
        assertThat(response).hasStatusOk();
        assertThat(response).bodyJson().extractingPath("$[0].accountNumber").isEqualTo("••••••7890");
        assertThat(post(director, url("bank-accounts"), bank("Other", true))).hasStatus(403);
        assertThat(mvc.get().uri(url("bank-accounts")).exchange()).hasStatus(401);
    }

    private String content(MvcTestResult response) {
        try { return response.getResponse().getContentAsString(); }
        catch (java.io.UnsupportedEncodingException e) { throw new IllegalStateException(e); }
    }
}
