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

/** Signed work decisions and salary snapshots share a PostgreSQL transaction. */
@IntegrationTest
class WorkDecisionSalaryApiIT {
    @Autowired MockMvcTester mvc;
    @Autowired TestAccounts accounts;
    @Autowired TestEmployees employees;
    @Autowired DataSource dataSource;

    JdbcTemplate jdbc;
    UUID employeeId;
    String admin;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        employees.deleteAll();
        employeeId = employees.create("Fictional Salary Decision Employee", null);
        admin = accounts.adminBearer(mvc);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("delete from employee_salary_profile where employee_id = ?", employeeId);
        jdbc.update("delete from work_decision where employee_id = ?", employeeId);
        jdbc.update("delete from contract_amendment where contract_id in "
                + "(select id from employment_contract where employee_id = ?)", employeeId);
        jdbc.update("delete from employment_contract where employee_id = ?", employeeId);
        employees.deleteAll();
    }

    String path() { return "/api/employees/" + employeeId; }

    MvcTestResult post(String bearer, String body) {
        return mvc.post().uri(path() + "/work-history").header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
    }

    String decision(String number, String effective, String payFields) {
        return """
                {"decisionNumber":"%s","kind":"REWARD","signedOn":"2026-01-01",
                 "effectiveOn":"%s","description":"Signed reward"%s}
                """.formatted(number, effective, payFields);
    }

    void contract() {
        String body = """
                {"contractNumber":"HD-WD-%s","contractType":"FIXED_TERM",
                 "signedOn":"2026-01-01","startsOn":"2026-01-01","endsOn":"2026-12-31",
                 "baseSalary":18000000,"insuranceSalary":16000000,
                 "allowancesJson":"[]","insured":true,"taxMethod":"PROGRESSIVE"}
                """.formatted(employeeId);
        assertThat(mvc.post().uri(path() + "/contracts").header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange()).hasStatus(201);
    }

    @Test
    void decisionCreatesLinkedSnapshotAndMaskedAuditAndSplitsPeriodWithAmendment() throws Exception {
        contract();
        String body = decision("QD-PAY-" + employeeId, "2026-02-01",
                ",\"baseSalary\":21000000,\"allowancesJson\":\"PRIVATE_ALLOWANCE_987\"");
        MvcTestResult saved = post(admin, body);
        assertThat(saved).hasStatus(201);
        UUID id = UUID.fromString(JsonPath.read(saved.getResponse().getContentAsString(), "$.sourceId"));
        assertThat(jdbc.queryForObject("""
                select count(*) from employee_salary_profile
                 where employee_id = ? and source_decision_id = ? and source_amendment_id is null
                   and base_salary = 21000000 and insurance_salary = 16000000
                   and allowances_json = 'PRIVATE_ALLOWANCE_987'
                """, Integer.class, employeeId, id)).isEqualTo(1);

        String contractId = jdbc.queryForObject("select id from employment_contract where employee_id = ?",
                UUID.class, employeeId).toString();
        String amendment = """
                {"amendmentNumber":"PL-WD-%s","signedOn":"2026-03-01",
                 "effectiveOn":"2026-03-10","description":"Later change",
                 "insuranceSalary":17000000}
                """.formatted(employeeId);
        assertThat(mvc.post().uri(path() + "/contracts/" + contractId + "/amendments")
                .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content(amendment).exchange()).hasStatus(201);
        MvcTestResult period = mvc.get().uri(path() + "/salary-profile?from=2026-01-01&to=2026-03-31")
                .header("Authorization", admin).exchange();
        assertThat(period).hasStatusOk();
        assertThat(period).bodyJson().extractingPath("$[0].to").isEqualTo("2026-01-31");
        assertThat(period).bodyJson().extractingPath("$[1].from").isEqualTo("2026-02-01");
        assertThat(period).bodyJson().extractingPath("$[1].to").isEqualTo("2026-03-09");
        assertThat(period).bodyJson().extractingPath("$[1].sourceDecisionId").isEqualTo(id.toString());
        assertThat(period).bodyJson().extractingPath("$[2].from").isEqualTo("2026-03-10");

        MvcTestResult audit = mvc.get().uri("/api/audit-logs?entityType=SALARY_PROFILE&entityId=" + employeeId)
                .header("Authorization", admin).exchange();
        assertThat(audit).bodyJson().extractingPath("$.total").isEqualTo(3);
        String decisionAuditId = jdbc.queryForObject("""
                select id from audit_log where entity_type = 'SALARY_PROFILE' and entity_id = ?
                  and summary = 'Salary profile changed by work decision'
                """, UUID.class, employeeId).toString();
        String detail = mvc.get().uri("/api/audit-logs/" + decisionAuditId)
                .header("Authorization", admin).exchange().getResponse().getContentAsString();
        assertThat(JsonPath.read(detail, "$.after.sourceDecisionId").toString()).isEqualTo(id.toString());
        assertThat(JsonPath.read(detail, "$.after.baseSalary").toString()).isEqualTo("***");
        assertThat(JsonPath.read(detail, "$.after.allowancesJson").toString()).isEqualTo("***");
        assertThat(detail).doesNotContain("21000000", "PRIVATE_ALLOWANCE_987");
    }

    @Test
    void noPayDecisionDoesNotCreateSnapshotAndDeniedWriteDoesNothing() {
        contract();
        String denied = accounts.bearer(mvc, accounts.create(Role.EMPLOYEE));
        assertThat(post(denied, decision("QD-DENIED-" + employeeId, "2026-02-01",
                ",\"baseSalary\":21000000"))).hasStatus(403);
        assertThat(post(admin, decision("QD-NOPAY-" + employeeId, "2026-02-01", "")))
                .hasStatus(201);
        assertThat(jdbc.queryForObject("select count(*) from work_decision where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from employee_salary_profile where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(1);
    }

    @Test
    void conflictAndMissingSourceRollBackDecisionSnapshotAndAudit() {
        String body = decision("QD-NOSOURCE-" + employeeId, "2026-02-01", ",\"baseSalary\":21000000");
        assertThat(post(admin, body)).hasStatus(409);
        assertThat(jdbc.queryForObject("select count(*) from work_decision where employee_id = ?",
                Integer.class, employeeId)).isZero();
        contract();
        assertThat(post(admin, decision("QD-SAMEDAY-" + employeeId, "2026-01-01",
                ",\"baseSalary\":21000000"))).hasStatus(409);
        assertThat(post(admin, decision("QD-NEGATIVE-" + employeeId, "2026-02-01",
                ",\"baseSalary\":-1"))).hasStatus(400);
        assertThat(jdbc.queryForObject("select count(*) from work_decision where employee_id = ?",
                Integer.class, employeeId)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from employee_salary_profile where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("""
                select count(*) from audit_log where entity_id = ? and entity_type = 'WORK_HISTORY'
                """, Integer.class, employeeId)).isZero();
        assertThat(jdbc.queryForObject("""
                select count(*) from audit_log where entity_id = ? and entity_type = 'SALARY_PROFILE'
                """, Integer.class, employeeId)).isEqualTo(1);
    }
}
