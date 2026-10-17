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

    @Test
    void formalContractClauseCanBeEvaluatedWithoutAnotherContractSuggestion() throws Exception {
        String formal = formalRequest("\"probationStartsOn\":\"2026-01-01\",\"probationEndsOn\":\"2026-03-31\"");
        assertThat(mvc.put().uri("/api/employees/" + employeeId + "/contracts/" + contractId)
                .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content(formal).exchange()).hasStatusOk()
                .bodyJson().extractingPath("$.probationEndsOn").isEqualTo("2026-03-31");
        assertThat(jdbc.queryForObject("select count(*) from employee_salary_profile where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(1);
        assertThat(post(admin, request("2026-01-01", "2026-02-01", "EXTEND"))).hasStatus(201);
        assertThat(post(admin, request("2026-02-01", "2026-03-01", "PASS"))).hasStatus(409);
        MvcTestResult passed = post(admin, request("2026-02-02", "2026-03-01", "PASS"));
        assertThat(passed).hasStatus(201);
        assertThat(passed).bodyJson().extractingPath("$.formalContractSuggestion").isNull();
        MvcTestResult listed = mvc.get().uri(path()).header("Authorization", admin).exchange();
        assertThat(listed).hasStatusOk();
        assertThat(listed).bodyJson().extractingPath("$[0].formalContractSuggestion").isNull();
        assertThat(mvc.get().uri("/api/employees/" + employeeId + "/work-history")
                .header("Authorization", admin).exchange())
                .bodyJson().extractingPath("$[0].kind").isEqualTo("PROBATION_PASS");
        assertThat(jdbc.queryForObject("select count(*) from employment_contract where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from employee_salary_profile where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(1);
        assertThat(mvc.put().uri("/api/employees/" + employeeId + "/contracts/" + contractId)
                .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content(formalRequest("\"probationStartsOn\":\"2026-01-01\",\"probationEndsOn\":\"2026-03-30\""))
                .exchange()).hasStatus(409);
        assertThat(jdbc.queryForObject("select probation_ends_on from employment_contract where id = ?",
                java.sql.Date.class, contractId).toLocalDate()).isEqualTo(java.time.LocalDate.parse("2026-03-31"));
    }

    @Test
    void clauseValidationAndDeniedRequestsRollback() {
        String uri = "/api/employees/" + employeeId + "/contracts/" + contractId;
        String employee = accounts.bearer(mvc, accounts.create(Role.EMPLOYEE));
        String probationWithClause = """
                {"contractNumber":"HD-TRIAL-%s","contractType":"PROBATION",
                 "signedOn":"2026-01-01","startsOn":"2026-01-01","endsOn":"2026-04-30",
                 "baseSalary":12000000,"insuranceSalary":null,"allowancesJson":"[]",
                 "probationStartsOn":"2026-01-01","probationEndsOn":"2026-03-31"}
                """.formatted(employeeId);
        assertThat(mvc.put().uri(uri).header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content(probationWithClause).exchange()).hasStatus(400);
        for (String clause : new String[] {
                "\"probationStartsOn\":\"2026-01-01\"",
                "\"probationStartsOn\":\"2025-12-31\",\"probationEndsOn\":\"2026-02-01\"",
                "\"probationStartsOn\":\"2026-03-01\",\"probationEndsOn\":\"2026-05-01\""
        }) {
            assertThat(mvc.put().uri(uri).header("Authorization", admin)
                    .contentType(MediaType.APPLICATION_JSON).content(formalRequest(clause)).exchange()).hasStatus(400);
        }
        assertThat(mvc.put().uri(uri).header("Authorization", employee)
                .contentType(MediaType.APPLICATION_JSON)
                .content(formalRequest("\"probationStartsOn\":\"2026-01-01\",\"probationEndsOn\":\"2026-03-31\""))
                .exchange()).hasStatus(403);
        assertThat(jdbc.queryForObject("select probation_starts_on from employment_contract where id = ?",
                java.sql.Date.class, contractId)).isNull();
        assertThat(jdbc.queryForObject("select count(*) from probation_evaluation where employee_id = ?",
                Integer.class, employeeId)).isZero();
    }

    @Test
    void createsFormalContractWithClauseAndRejectsEvaluationOutsideClause() throws Exception {
        UUID formalEmployee = employees.create("Fictional Formal Clause Employee", null);
        try {
            String body = """
                    {"contractNumber":"HD-FORMAL-%s","contractType":"INDEFINITE",
                     "signedOn":"2026-01-01","startsOn":"2026-01-01","endsOn":null,
                     "probationStartsOn":"2026-01-15","probationEndsOn":"2026-03-15",
                     "baseSalary":18000000,"insuranceSalary":18000000,"allowancesJson":"[]"}
                    """.formatted(formalEmployee);
            String contractPath = "/api/employees/" + formalEmployee + "/contracts";
            MvcTestResult created = mvc.post().uri(contractPath).header("Authorization", admin)
                    .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
            assertThat(created).hasStatus(201);
            UUID formalContract = UUID.fromString(JsonPath.read(created.getResponse().getContentAsString(), "$.id"));
            assertThat(created).bodyJson().extractingPath("$.probationStartsOn").isEqualTo("2026-01-15");
            assertThat(mvc.get().uri(contractPath).header("Authorization", admin).exchange())
                    .bodyJson().extractingPath("$[0].probationEndsOn").isEqualTo("2026-03-15");
            String evaluation = request("2026-01-15", "2026-03-16", "PASS")
                    .replace(contractId.toString(), formalContract.toString());
            String evaluationPath = "/api/employees/" + formalEmployee + "/probation-evaluations";
            assertThat(mvc.post().uri(evaluationPath).header("Authorization", admin)
                    .contentType(MediaType.APPLICATION_JSON).content(evaluation).exchange()).hasStatus(400);
            assertThat(jdbc.queryForObject("select count(*) from probation_evaluation where employee_id = ?",
                    Integer.class, formalEmployee)).isZero();
            assertThat(mvc.post().uri(evaluationPath).header("Authorization", admin)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(evaluation.replace("2026-03-16", "2026-03-15")).exchange())
                    .hasStatus(201).bodyJson().extractingPath("$.formalContractSuggestion").isNull();
            assertThat(jdbc.queryForObject("select count(*) from employee_salary_profile where employee_id = ?",
                    Integer.class, formalEmployee)).isEqualTo(1);
        } finally {
            jdbc.update("delete from probation_evaluation where employee_id = ?", formalEmployee);
            jdbc.update("delete from employee_salary_profile where employee_id = ?", formalEmployee);
            jdbc.update("delete from employment_contract where employee_id = ?", formalEmployee);
        }
    }

    String formalRequest(String clause) {
        return """
                {"contractNumber":"HD-TRIAL-%s","contractType":"INDEFINITE",
                 "signedOn":"2026-01-01","startsOn":"2026-01-01","endsOn":"2026-04-30",
                 "baseSalary":12000000,"insuranceSalary":null,"allowancesJson":"[]",
                 "insured":false,"taxMethod":"WITHHOLD_10",
                 "overrideReason":"Existing terms retained",%s}
                """.formatted(employeeId, clause);
    }
}
