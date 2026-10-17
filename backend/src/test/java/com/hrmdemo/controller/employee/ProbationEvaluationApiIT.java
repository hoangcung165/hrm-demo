package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@IntegrationTest
class ProbationEvaluationApiIT {
    @Autowired MockMvcTester mvc;
    @Autowired TestAccounts accounts;
    @Autowired TestEmployees employees;
    @Autowired DataSource dataSource;

    JdbcTemplate jdbc;
    UUID employeeId;
    UUID evaluatorId;
    UUID contractId;
    String admin;

    @BeforeEach
    void setUp() throws Exception {
        jdbc = new JdbcTemplate(dataSource);
        employees.deleteAll();
        employeeId = employees.create("Fictional Probation Employee", null);
        evaluatorId = employees.create("Fictional Evaluator", null);
        admin = accounts.adminBearer(mvc);
        String contract = """
                {"contractNumber":"HD-TRIAL-%s","contractType":"PROBATION",
                 "signedOn":"2026-01-01","startsOn":"2026-01-01","endsOn":"2026-04-30",
                 "baseSalary":12000000,"insuranceSalary":null,"allowancesJson":"[]"}
                """.formatted(employeeId);
        MvcTestResult created = mvc.post().uri("/api/employees/" + employeeId + "/contracts")
                .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content(contract).exchange();
        assertThat(created).hasStatus(201);
        contractId = UUID.fromString(JsonPath.read(created.getResponse().getContentAsString(), "$.id"));
    }

    @AfterEach
    void tearDown() {
        jdbc.update("delete from probation_evaluation where employee_id = ?", employeeId);
        jdbc.update("delete from employee_salary_profile where employee_id = ?", employeeId);
        jdbc.update("delete from contract_amendment where contract_id = ?", contractId);
        jdbc.update("delete from employment_contract where employee_id = ?", employeeId);
        employees.deleteAll();
    }

    String path() { return "/api/employees/" + employeeId + "/probation-evaluations"; }

    String request(String starts, String ends, String outcome) {
        return """
                {"sourceContractId":"%s","evaluatorId":"%s","startsOn":"%s",
                 "endsOn":"%s","outcome":"%s","notes":"Evaluation notes"}
                """.formatted(contractId, evaluatorId, starts, ends, outcome);
    }

    MvcTestResult post(String bearer, String body) {
        return mvc.post().uri(path()).header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
    }

    @Test
    void passReturnsSourceLinkedSuggestionWithoutCreatingFormalContract() throws Exception {
        String amendment = """
                {"amendmentNumber":"PL-TRIAL-%s","signedOn":"2026-01-15",
                 "effectiveOn":"2026-02-01","description":"Trial salary adjustment",
                 "baseSalary":14000000}
                """.formatted(employeeId);
        assertThat(mvc.post().uri("/api/employees/" + employeeId + "/contracts/" + contractId + "/amendments")
                .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content(amendment).exchange()).hasStatus(201);
        MvcTestResult created = post(admin, request("2026-01-01", "2026-03-31", "PASS"));
        assertThat(created).hasStatus(201);
        String sourceId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        assertThat(created).bodyJson().extractingPath("$.sourceContractId").isEqualTo(contractId.toString());
        assertThat(created).bodyJson().extractingPath("$.evaluatorId").isEqualTo(evaluatorId.toString());
        assertThat(created).bodyJson().extractingPath("$.formalContractSuggestion.sourceContractId")
                .isEqualTo(contractId.toString());
        assertThat(created).bodyJson().extractingPath("$.formalContractSuggestion.contractType")
                .isEqualTo("INDEFINITE");
        assertThat(created).bodyJson().extractingPath("$.formalContractSuggestion.startsOn")
                .isEqualTo("2026-05-01");
        assertThat(created).bodyJson().extractingPath("$.formalContractSuggestion.taxMethod")
                .isEqualTo("PROGRESSIVE");
        assertThat(jdbc.queryForObject("select count(*) from employment_contract where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(1);
        String rewrite = """
                {"contractNumber":"HD-TRIAL-%s","contractType":"INDEFINITE",
                 "signedOn":"2026-01-01","startsOn":"2026-01-01","endsOn":"2026-04-30",
                 "baseSalary":12000000,"insuranceSalary":null,"allowancesJson":"[]",
                 "insured":false,"taxMethod":"WITHHOLD_10"}
                """.formatted(employeeId);
        assertThat(mvc.put().uri("/api/employees/" + employeeId + "/contracts/" + contractId)
                .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content(rewrite).exchange()).hasStatus(409);
        MvcTestResult listed = mvc.get().uri(path()).header("Authorization", admin).exchange();
        assertThat(listed).hasStatusOk();
        Number salary = JsonPath.read(listed.getResponse().getContentAsString(),
                "$[0].formalContractSuggestion.baseSalary");
        assertThat(salary.longValue()).isEqualTo(14_000_000L);
        MvcTestResult history = mvc.get().uri("/api/employees/" + employeeId + "/work-history")
                .header("Authorization", admin).exchange();
        assertThat(history).bodyJson().extractingPath("$[0].kind").isEqualTo("PROBATION_PASS");
        assertThat(history).bodyJson().extractingPath("$[0].sourceId").isEqualTo(sourceId);
        assertThat(history).bodyJson().extractingPath("$[0].effectiveOn").isEqualTo("2026-03-31");
        MvcTestResult audit = mvc.get().uri("/api/audit-logs?entityType=PROBATION_EVALUATION&entityId=" + employeeId)
                .header("Authorization", admin).exchange();
        assertThat(audit).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(post(admin, request("2026-01-01", "2026-03-31", "PASS"))).hasStatus(409);
        assertThat(jdbc.queryForObject("select count(*) from probation_evaluation where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(1);
    }

    @Test
    void extendCanBeFollowedByPassAndFailHasNoSuggestion() {
        assertThat(post(admin, request("2026-01-01", "2026-02-01", "EXTEND")))
                .bodyJson().extractingPath("$.formalContractSuggestion").isNull();
        assertThat(post(admin, request("2026-02-01", "2026-03-01", "PASS"))).hasStatus(409);
        assertThat(post(admin, request("2026-02-02", "2026-03-01", "PASS"))).hasStatus(201);
        assertThat(jdbc.queryForObject("select count(*) from probation_evaluation where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(2);
    }

    @Test
    void invalidSourceDatesAndDeniedRequestsLeaveNoEvaluation() {
        String employee = accounts.bearer(mvc, accounts.create(Role.EMPLOYEE));
        assertThat(post(employee, request("2026-01-01", "2026-02-01", "FAIL")))
                .hasStatus(403);
        assertThat(mvc.get().uri(path()).header("Authorization", employee).exchange()).hasStatus(403);
        assertThat(post(admin, request("2026-01-01", "2026-05-01", "FAIL"))).hasStatus(400);
        assertThat(post(admin, request("2026-01-01", "2026-02-01", "UNKNOWN"))).hasStatus(400);
        assertThat(post(admin, request("2026-01-01", "2026-02-01", "PASS")
                .replace(contractId.toString(), UUID.randomUUID().toString()))).hasStatus(404);
        assertThat(jdbc.queryForObject("select count(*) from probation_evaluation where employee_id = ?",
                Integer.class, employeeId)).isZero();
        assertThat(post(admin, request("2026-01-01", "2026-02-01", "FAIL")))
                .bodyJson().extractingPath("$.formalContractSuggestion").isNull();
        assertThat(post(admin, request("2026-02-02", "2026-03-01", "PASS"))).hasStatus(409);
    }

    @Test
    void ordinaryContractIsNotAProbationSource() {
        String rewrite = """
                {"contractNumber":"HD-TRIAL-%s","contractType":"INDEFINITE",
                 "signedOn":"2026-01-01","startsOn":"2026-01-01","endsOn":"2026-04-30",
                 "baseSalary":12000000,"insuranceSalary":null,"allowancesJson":"[]",
                 "insured":false,"taxMethod":"WITHHOLD_10",
                 "overrideReason":"Existing terms retained"}
                """.formatted(employeeId);
        assertThat(mvc.put().uri("/api/employees/" + employeeId + "/contracts/" + contractId)
                .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content(rewrite).exchange()).hasStatusOk();
        assertThat(post(admin, request("2026-01-01", "2026-02-01", "PASS"))).hasStatus(404);
        assertThat(jdbc.queryForObject("select count(*) from probation_evaluation where employee_id = ?",
                Integer.class, employeeId)).isZero();
    }
}
