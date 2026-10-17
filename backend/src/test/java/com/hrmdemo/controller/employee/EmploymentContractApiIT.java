package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.entity.auth.Role;
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

    MvcTestResult auditRecords(String bearer) {
        return mvc.get().uri("/api/audit-logs?entityType=SALARY_PROFILE&entityId=" + employeeId)
                .header("Authorization", bearer).exchange();
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

        MvcTestResult audit = auditRecords(admin);
        assertThat(audit).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(audit).bodyJson().extractingPath("$.items[0].action").isEqualTo("CREATE");
        assertThat(audit).bodyJson().extractingPath("$.items[0].actorName").isNotNull();
        assertThat(mvc.get().uri("/api/audit-logs/entity-types").header("Authorization", admin).exchange())
                .bodyJson().extractingPath("$[?(@.key=='SALARY_PROFILE')].label")
                .isEqualTo(java.util.List.of("Salary profile"));
        String auditId = JsonPath.read(audit.getResponse().getContentAsString(), "$.items[0].id");
        MvcTestResult detail = mvc.get().uri("/api/audit-logs/" + auditId)
                .header("Authorization", admin).exchange();
        assertThat(detail).bodyJson().extractingPath("$.after.employeeId").isEqualTo(employeeId.toString());
        assertThat(detail).bodyJson().extractingPath("$.after.sourceContractId").isEqualTo(id);
        assertThat(detail).bodyJson().extractingPath("$.after.effectiveOn").isEqualTo("2026-01-05");
        assertThat(detail).bodyJson().extractingPath("$.after.baseSalary").isEqualTo("***");
        assertThat(detail.getResponse().getContentAsString()).doesNotContain("18000000");
        assertThat(detail).bodyJson().extractingPath("$.before").isNull();
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
    void salaryAuditMasksSensitiveFieldsInStoredRecordAndResponses() throws Exception {
        String body = request("HD-IT-MASK-" + employeeId, "2026-04-01", null)
                .replace("\"insuranceSalary\":18000000", "\"insuranceSalary\":12345678")
                .replace("\"allowancesJson\":\"[]\"", "\"allowancesJson\":\"PRIVATE_ALLOWANCE_987\"")
                .replace("\"insured\":true", "\"insured\":false,\"overrideReason\":\"PRIVATE_REASON_654\"");
        assertThat(create(body)).hasStatus(201);

        MvcTestResult list = auditRecords(admin);
        String auditId = JsonPath.read(list.getResponse().getContentAsString(), "$.items[0].id");
        String detail = mvc.get().uri("/api/audit-logs/" + auditId)
                .header("Authorization", admin).exchange().getResponse().getContentAsString();
        String stored = jdbc.queryForObject("""
                select after_values::text from audit_log
                 where id = ? and entity_type = 'SALARY_PROFILE'
                """, String.class, UUID.fromString(auditId));
        for (String visible : new String[] {list.getResponse().getContentAsString(), detail, stored}) {
            assertThat(visible).doesNotContain("12345678", "PRIVATE_ALLOWANCE_987", "PRIVATE_REASON_654");
        }
        for (String field : new String[] {"baseSalary", "insuranceSalary", "allowancesJson", "overrideReason"}) {
            assertThat(JsonPath.read(detail, "$.after." + field).toString()).isEqualTo("***");
        }
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
        Number salary = JsonPath.read(timeline.getResponse().getContentAsString(), "$[1].baseSalary");
        assertThat(salary.longValue()).isEqualTo(21_000_000L);

        MvcTestResult audit = auditRecords(admin);
        assertThat(audit).bodyJson().extractingPath("$.total").isEqualTo(2);
        assertThat(audit).bodyJson().extractingPath("$.items[0].action").isEqualTo("UPDATE");
        String auditId = JsonPath.read(audit.getResponse().getContentAsString(), "$.items[0].id");
        MvcTestResult detail = mvc.get().uri("/api/audit-logs/" + auditId)
                .header("Authorization", admin).exchange();
        assertThat(detail).bodyJson().extractingPath("$.before.baseSalary").isEqualTo("***");
        assertThat(detail).bodyJson().extractingPath("$.after.baseSalary").isEqualTo("***");
        assertThat(detail).bodyJson().extractingPath("$.after.sourceAmendmentId")
                .isEqualTo(JsonPath.read(changed.getResponse().getContentAsString(), "$.id"));
        assertThat(detail).bodyJson().extractingPath("$.after.effectiveOn").isEqualTo("2026-01-16");
        assertThat(detail.getResponse().getContentAsString()).doesNotContain("18000000", "21000000");

        String hr = accounts.bearer(mvc, accounts.create(Role.HR, Role.EMPLOYEE));
        assertThat(auditRecords(hr)).hasStatus(403);
        assertThat(mvc.get().uri("/api/audit-logs/" + auditId).header("Authorization", hr).exchange())
                .hasStatus(403);
    }

    @Test
    void rejectedAmendmentRollsBackTheDocumentAndDoesNotWriteAnAuditRecord() throws Exception {
        MvcTestResult created = create(request("HD-IT-ROLLBACK-" + employeeId, "2026-01-01", "2026-12-31"));
        assertThat(created).hasStatus(201);
        String contractId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        String body = """
                {"amendmentNumber":"PL-ROLLBACK-%s","signedOn":"2026-01-10",
                 "effectiveOn":"2026-01-01","description":"Duplicate effective date",
                 "baseSalary":21000000}
                """.formatted(employeeId);

        assertThat(mvc.post().uri(endpoint() + "/" + contractId + "/amendments")
                .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content(body).exchange()).hasStatus(409);

        assertThat(jdbc.queryForObject("select count(*) from contract_amendment where contract_id = ?",
                Integer.class, UUID.fromString(contractId))).isZero();
        assertThat(jdbc.queryForObject("select count(*) from employee_salary_profile where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(1);
        assertThat(auditRecords(admin)).bodyJson().extractingPath("$.total").isEqualTo(1);
    }

    String probationRequest(String number, String extra) {
        return """
                {"contractNumber":"%s","contractType":"PROBATION",
                 "signedOn":"2026-01-01","startsOn":"2026-01-05","endsOn":"2026-03-04",
                 "baseSalary":17000000,"allowancesJson":"[]"%s}
                """.formatted(number, extra);
    }

    @Test
    void probationContractDefaultsToUninsuredWithTenPercentWithholding() throws Exception {
        MvcTestResult created = create(probationRequest("HD-IT-PROB-" + employeeId, ""));
        assertThat(created).hasStatus(201);
        assertThat(created).bodyJson().extractingPath("$.insured").isEqualTo(false);
        assertThat(created).bodyJson().extractingPath("$.taxMethod").isEqualTo("WITHHOLD_10");
        assertThat(jdbc.queryForObject("""
                select count(*) from employee_salary_profile
                 where employee_id = ? and insured = false and tax_method = 'WITHHOLD_10'
                """, Integer.class, employeeId)).isEqualTo(1);
    }

    @Test
    void departingFromTheDefaultFlagsRequiresAReasonAndIsAudited() throws Exception {
        String insuredWithoutReason = probationRequest("HD-IT-OVR-1-" + employeeId, ",\"insured\":true");
        assertThat(create(insuredWithoutReason)).hasStatus(400);
        String taxWithoutReason = probationRequest("HD-IT-OVR-2-" + employeeId, ",\"taxMethod\":\"PROGRESSIVE\"");
        assertThat(create(taxWithoutReason)).hasStatus(400);
        assertThat(jdbc.queryForObject("select count(*) from employment_contract where employee_id = ?",
                Integer.class, employeeId)).isZero();

        String withReason = probationRequest("HD-IT-OVR-3-" + employeeId,
                ",\"insured\":true,\"taxMethod\":\"PROGRESSIVE\",\"overrideReason\":\"Signed insured from day one\"");
        MvcTestResult created = create(withReason);
        assertThat(created).hasStatus(201);
        assertThat(created).bodyJson().extractingPath("$.insured").isEqualTo(true);
        assertThat(created).bodyJson().extractingPath("$.taxMethod").isEqualTo("PROGRESSIVE");
        assertThat(auditRecords(admin)).bodyJson().extractingPath("$.total").isEqualTo(1);
    }

    @Test
    void salaryProfileHasNoDirectWritePathAndContractEditCannotRewriteIt() throws Exception {
        MvcTestResult created = create(request("HD-IT-LOCK-" + employeeId, "2026-01-01", "2026-12-31"));
        assertThat(created).hasStatus(201);
        String contractId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        String profile = "/api/employees/" + employeeId + "/salary-profile";

        assertThat(mvc.post().uri(profile).header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"baseSalary\":99000000}").exchange())
                .hasStatus(405);
        assertThat(mvc.put().uri(profile).header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"baseSalary\":99000000}").exchange())
                .hasStatus(405);
        assertThat(mvc.delete().uri(profile).header("Authorization", admin).exchange()).hasStatus(405);

        String raised = request("HD-IT-LOCK-" + employeeId, "2026-01-01", "2026-12-31")
                .replace("18000000", "99000000");
        assertThat(mvc.put().uri(endpoint() + "/" + contractId).header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content(raised).exchange()).hasStatus(409);
        assertThat(mvc.delete().uri(endpoint() + "/" + contractId).header("Authorization", admin).exchange())
                .hasStatus(409);
        assertThat(jdbc.queryForObject("select base_salary from employee_salary_profile where employee_id = ?",
                Long.class, employeeId)).isEqualTo(18_000_000L);
    }

    @Test
    void amendmentChangingOnlyTheFlagsNeedsAReasonAndWritesAnAuditRecord() throws Exception {
        MvcTestResult created = create(request("HD-IT-FLAGS-" + employeeId, "2026-01-01", "2026-12-31"));
        String contractId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        String base = """
                {"amendmentNumber":"PL-FLAGS-%s","signedOn":"2026-01-10","effectiveOn":"2026-02-01",
                 "description":"Tax method change","taxMethod":"WITHHOLD_10"%s}
                """;
        assertThat(mvc.post().uri(endpoint() + "/" + contractId + "/amendments")
                .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content(base.formatted(employeeId, "")).exchange()).hasStatus(400);
        assertThat(auditRecords(admin)).bodyJson().extractingPath("$.total").isEqualTo(1);

        assertThat(mvc.post().uri(endpoint() + "/" + contractId + "/amendments")
                .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content(base.formatted(employeeId, ",\"overrideReason\":\"Agreed in writing\"")).exchange())
                .hasStatus(201);
        assertThat(auditRecords(admin)).bodyJson().extractingPath("$.total").isEqualTo(2);
    }

    @Test
    void accountsWithoutContractPermissionsAreRefused() {
        String employee = accounts.bearer(mvc, accounts.create(Role.EMPLOYEE));
        assertThat(mvc.get().uri(endpoint()).header("Authorization", employee).exchange()).hasStatus(403);
        assertThat(mvc.post().uri(endpoint()).header("Authorization", employee)
                .contentType(MediaType.APPLICATION_JSON)
                .content(request("HD-IT-DENIED-" + employeeId, "2026-01-01", null)).exchange()).hasStatus(403);
        assertThat(mvc.get().uri("/api/employees/" + employeeId
                + "/salary-profile?from=2026-01-01&to=2026-01-31")
                .header("Authorization", employee).exchange()).hasStatus(403);
    }
}
