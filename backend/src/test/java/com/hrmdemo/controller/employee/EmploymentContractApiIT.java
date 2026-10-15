package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

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

/** Contract + salary snapshot use the real DB transaction, not mocked repositories. */
@IntegrationTest
class EmploymentContractApiIT {
    @Autowired MockMvcTester mvc;
    @Autowired TestEmployees employees;
    @Autowired TestAccounts accounts;
    @Autowired DataSource dataSource;

    JdbcTemplate jdbc;
    UUID employeeId;
    String admin;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        employees.deleteAll();
        employeeId = employees.create("Fictional Contract Employee", null);
        admin = accounts.adminBearer(mvc);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("delete from employee_salary_profile where employee_id = ?", employeeId);
        jdbc.update("delete from contract_amendment where contract_id in (select id from employment_contract where employee_id = ?)", employeeId);
        jdbc.update("delete from employment_contract where employee_id = ?", employeeId);
        employees.deleteAll();
    }

    String endpoint() { return "/api/employees/" + employeeId + "/contracts"; }

    String request(String number, String starts, String ends) {
        return """
                {"contractNumber":"%s","contractType":"FIXED_TERM",
                 "signedOn":"2026-01-01","startsOn":"%s","endsOn":%s,
                 "baseSalary":18000000,"insuranceSalary":18000000,
                 "allowancesJson":"[]","insured":true,"taxMethod":"PROGRESSIVE"}
                """.formatted(number, starts, ends == null ? "null" : "\"" + ends + "\"");
    }

    MvcTestResult create(String json) {
        return mvc.post().uri(endpoint()).header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    @Test
    void postPersistsSignedContractAndImmutableSourceLinkedSalaryProfile() throws Exception {
        MvcTestResult result = create(request("HD-IT-1-" + employeeId, "2026-01-05", "2026-03-01"));
        assertThat(result).hasStatus(201);
        String id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");

        assertThat(jdbc.queryForObject("select count(*) from employment_contract where id = ? and employee_id = ?",
                Integer.class, UUID.fromString(id), employeeId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("""
                select count(*) from employee_salary_profile
                 where employee_id = ? and source_contract_id = ?
                   and source_amendment_id is null and effective_on = date '2026-01-05'
                   and base_salary = 18000000
                """, Integer.class, employeeId, UUID.fromString(id))).isEqualTo(1);
        assertThat(mvc.get().uri(endpoint()).header("Authorization", admin).exchange())
                .bodyJson().extractingPath("$[0].contractNumber")
                .isEqualTo("HD-IT-1-" + employeeId);
    }

    @Test
    void openEndedContractAlsoCreatesItsSourceProfile() {
        MvcTestResult result = create(request("HD-IT-OPEN-" + employeeId, "2026-04-01", null));
        assertThat(result).hasStatus(201);
        assertThat(jdbc.queryForObject("""
                select count(*) from employee_salary_profile
                 where employee_id = ? and ends_on is null and effective_on = date '2026-04-01'
                """, Integer.class, employeeId)).isEqualTo(1);
    }

    @Test
    void overlapIsRejectedWithConflictNotUnexpectedDatabaseError() {
        assertThat(create(request("HD-IT-A-" + employeeId, "2026-01-01", "2026-03-31"))).hasStatus(201);
        assertThat(create(request("HD-IT-B-" + employeeId, "2026-03-01", "2026-04-30"))).hasStatus(409);
        assertThat(jdbc.queryForObject("select count(*) from employment_contract where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(1);
    }
    @Test
    void nonOverlappingAdjacentContractsCanBeCreated() {
        assertThat(create(request("HD-IT-ADJ-1-" + employeeId, "2026-01-01", "2026-03-31")))
                .hasStatus(201);
        assertThat(create(request("HD-IT-ADJ-2-" + employeeId, "2026-04-01", "2026-12-31")))
                .hasStatus(201);
        assertThat(jdbc.queryForObject("select count(*) from employee_salary_profile where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(2);
    }

    @Test
    void signedSalaryAmendmentCreatesSecondImmutableEffectiveDatedProfile() throws Exception {
        MvcTestResult created = create(request("HD-IT-AMEND-" + employeeId, "2026-01-01", "2026-12-31"));
        assertThat(created).hasStatus(201);
        String contractId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        String amendment = """
                {"amendmentNumber":"PL-IT-%s","signedOn":"2026-01-10",
                 "effectiveOn":"2026-01-16","description":"Signed salary adjustment",
                 "baseSalary":21000000}
                """.formatted(employeeId);

        MvcTestResult changed = mvc.post().uri(endpoint() + "/" + contractId + "/amendments")
                .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content(amendment).exchange();
        assertThat(changed).hasStatus(201);
        assertThat(jdbc.queryForObject("""
                select count(*) from employee_salary_profile
                where employee_id = ? and source_contract_id = ?
                """, Integer.class, employeeId, UUID.fromString(contractId))).isEqualTo(2);

        MvcTestResult timeline = mvc.get().uri("/api/employees/" + employeeId
                        + "/salary-profile?from=2026-01-01&to=2026-01-31")
                .header("Authorization", admin).exchange();
        assertThat(timeline).hasStatusOk();
        assertThat(timeline).bodyJson().extractingPath("$[0].to").isEqualTo("2026-01-15");
        assertThat(timeline).bodyJson().extractingPath("$[1].from").isEqualTo("2026-01-16");
        assertThat(timeline).bodyJson().extractingPath("$[1].baseSalary").isEqualTo(21000000);
    }

}
