package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.orgunit.OrgUnitType;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
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
class ExpiryApiIT {
    @Autowired MockMvcTester mvc;
    @Autowired TestAccounts accounts;
    @Autowired TestEmployees employees;
    @Autowired OrgUnitRepository units;
    @Autowired DataSource dataSource;
    @Autowired Clock clock;
    final List<UUID> createdEmployees = new ArrayList<>(), overrides = new ArrayList<>();
    final List<OrgUnit> createdUnits = new ArrayList<>();
    JdbcTemplate jdbc;
    LocalDate today;
    UUID employee, trial, clause;
    String admin;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        employees.deleteAll();
        resetPolicies();
        today = LocalDate.now(clock);
        admin = accounts.adminBearer(mvc);
        employee = person("Fictional Expiry Employee", null);
        contract(employee, "FIXED_TERM", today.plusDays(30), null);
        trial = contract(employee, "PROBATION", today.plusDays(14), null);
        clause = contract(employee, "INDEFINITE", null, today.plusDays(14));
        contract(employee, "INDEFINITE", null, null);
        certificate(employee, today.plusDays(30));
        certificate(employee, today.plusDays(31));
        certificate(employee, today.minusDays(1));
        certificate(employee, null);
        document("VISA", today.plusDays(60));
        document("WORK_PERMIT", today);
        document("PASSPORT", today);
    }

    @AfterEach
    void cleanUp() {
        overrides.forEach(id -> jdbc.update("delete from role_permission_override where id = ?", id));
        for (UUID id : createdEmployees) {
            jdbc.update("delete from probation_evaluation where employee_id = ?", id);
            jdbc.update("delete from employment_contract where employee_id = ?", id);
        }
        employees.deleteAll();
        units.deleteAll(createdUnits);
        resetPolicies();
    }

    @Test
    void inclusivePolicyWindowsUnifySourcesWithoutSensitiveFieldsAndPageStably() throws Exception {
        MvcTestResult result = get(admin, "");
        assertThat(result).hasStatusOk().bodyJson().extractingPath("$.total").isEqualTo(6);
        assertThat(result).bodyJson().extractingPath("$.asOf").isEqualTo(today.toString());
        String json = result.getResponse().getContentAsString();
        assertThat(json).doesNotContain("contractNumber", "documentNumber", "baseSalary", "PRIVATE-NUMBER");
        List<String> types = JsonPath.read(json, "$.items[*].type");
        assertThat(types).containsExactlyInAnyOrder("CONTRACT", "PROBATION", "PROBATION", "CERTIFICATE", "VISA", "WORK_PERMIT");
        assertThat(get(admin, "?type=CONTRACT")).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(get(admin, "?type=CERTIFICATE")).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(get(admin, "?from=" + today.plusDays(1) + "&to=" + today.plusDays(29) + "&type=CERTIFICATE"))
                .bodyJson().extractingPath("$.total").isEqualTo(0);
        String first = get(admin, "?size=1").getResponse().getContentAsString();
        assertThat(JsonPath.<Integer>read(first, "$.items[0].daysRemaining")).isZero();
        assertThat(JsonPath.<String>read(first, "$.items[0].type")).isEqualTo("WORK_PERMIT");
        assertThat(get(admin, "?size=1").getResponse().getContentAsString()).isEqualTo(first);
        assertThat(get(admin, "?page=6&size=1")).bodyJson().extractingPath("$.items").asList().isEmpty();
        assertThat(get(admin, "?page=6&size=1")).bodyJson().extractingPath("$.total").isEqualTo(6);
    }

    @Test
    void finalProbationOutcomesResolveTheirMilestonesWhileExtendAndInactiveAreHandled() {
        evaluation(trial, "PASS");
        evaluation(clause, "EXTEND");
        assertThat(get(admin, "?type=PROBATION")).bodyJson().extractingPath("$.total").isEqualTo(1);
        evaluation(clause, "FAIL");
        assertThat(get(admin, "?type=PROBATION")).bodyJson().extractingPath("$.total").isEqualTo(0);
        jdbc.update("update employee set status = 'INACTIVE' where id = ?", employee);
        assertThat(get(admin, "")).bodyJson().extractingPath("$.total").isEqualTo(0);
    }

    @Test
    void policyWritesPersistAuditAndImmediatelyNarrowTheQuery() {
        String hr = accounts.bearer(mvc, accounts.create(Role.HR));
        String body = """
                {"advanceDays":{"CONTRACT":0,"PROBATION":14,"VISA":365,"WORK_PERMIT":60,"CERTIFICATE":0}}
                """;
        assertThat(mvc.get().uri("/api/expiry/settings").header("Authorization", hr).exchange())
                .hasStatusOk().bodyJson().extractingPath("$.canEdit").isEqualTo(false);
        assertThat(put(hr, body)).hasStatus(403);
        long before = auditCount();
        assertThat(put(admin, body)).hasStatusOk().bodyJson().extractingPath("$.advanceDays.CONTRACT").isEqualTo(0);
        assertThat(mvc.get().uri("/api/expiry/settings").header("Authorization", admin).exchange())
                .bodyJson().extractingPath("$.advanceDays.VISA").isEqualTo(365);
        assertThat(auditCount()).isEqualTo(before + 1);
        assertThat(put(admin, body)).hasStatusOk();
        assertThat(auditCount()).isEqualTo(before + 1);
        assertThat(get(admin, "?type=CONTRACT")).bodyJson().extractingPath("$.total").isEqualTo(0);
        certificate(employee, today);
        assertThat(get(admin, "?type=CERTIFICATE")).bodyJson().extractingPath("$.total").isEqualTo(1);
        for (String invalid : List.of("{}", "{\"advanceDays\":{\"CONTRACT\":30}}", body.replace("365", "366"),
                body.replace("365", "-1"), body.replace("365", "null"), body.replace("VISA", "UNKNOWN")))
            assertThat(put(admin, invalid)).hasStatus(400);
        assertThat(auditCount()).isEqualTo(before + 1);
    }

    @Test
    void rejectsAnonymousMissingPermissionsAndInvalidFilters() {
        assertThat(mvc.get().uri("/api/expiry").exchange()).hasStatus(401);
        for (Role role : List.of(Role.EMPLOYEE, Role.DIRECTOR, Role.LINE_MANAGER))
            assertThat(get(accounts.bearer(mvc, accounts.create(role)), "")).hasStatus(403);
        assertThat(get(accounts.bearer(mvc, accounts.create(Role.HR)), "")).hasStatusOk();
        for (String query : List.of("?type=PASSPORT", "?page=-1", "?size=0", "?size=101", "?page=10001",
                "?from=" + today.minusDays(1), "?to=" + today.minusDays(1), "?to=" + today.plusDays(366)))
            assertThat(get(admin, query)).hasStatus(400);
    }

    @Test
    void scopedManagerAndExplicitlyGrantedSelfOnlyAccountNeverSeeOtherEmployees() {
        OrgUnit unit = units.save(new OrgUnit(null, "EXP" + UUID.randomUUID().toString().substring(0, 7).toUpperCase(Locale.ROOT),
                "Fictional Expiry Unit", OrgUnitType.DEPARTMENT, null, 0, Instant.now()));
        createdUnits.add(unit);
        UUID head = person("Fictional Expiry Manager", unit.getId());
        employees.makeHead(unit.getId(), head);
        UUID member = person("Fictional Expiry Member", unit.getId());
        certificate(member, today);
        var manager = accounts.create(Role.LINE_MANAGER);
        employees.link(manager.id(), head);
        grant("LINE_MANAGER", "EMPLOYEE_SENSITIVE_VIEW");
        assertThat(get(accounts.bearer(mvc, manager), "")).hasStatusOk()
                .bodyJson().extractingPath("$.total").isEqualTo(1);
        var self = accounts.create(Role.EMPLOYEE);
        employees.link(self.id(), member);
        grant("EMPLOYEE", "EMPLOYEE_VIEW");
        grant("EMPLOYEE", "EMPLOYEE_SENSITIVE_VIEW");
        assertThat(get(accounts.bearer(mvc, self), "")).hasStatusOk()
                .bodyJson().extractingPath("$.items[0].employeeId").isEqualTo(member.toString());
        assertThat(get(accounts.bearer(mvc, self), "")).bodyJson().extractingPath("$.total").isEqualTo(1);
    }

    MvcTestResult get(String bearer, String query) {
        return mvc.get().uri("/api/expiry" + query).header("Authorization", bearer).exchange();
    }

    MvcTestResult put(String bearer, String body) {
        return mvc.put().uri("/api/expiry/settings").header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
    }

    UUID person(String name, UUID unit) {
        UUID id = employees.create(name, unit);
        createdEmployees.add(id);
        return id;
    }

    UUID contract(UUID owner, String type, LocalDate end, LocalDate probationEnd) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into employment_contract(id, legal_entity_id, employee_id, contract_number, contract_type,
                    signed_on, starts_on, ends_on, base_salary, insured, tax_method, created_at, updated_at,
                    probation_starts_on, probation_ends_on)
                values (?, (select id from legal_entity), ?, ?, ?, ?, ?, ?, 12345678, false, 'WITHHOLD_10',
                    now(), now(), ?, ?)
                """, id, owner, "PRIVATE-NUMBER-" + id, type, today.minusDays(100), today.minusDays(100), end,
                probationEnd == null ? null : today.minusDays(90), probationEnd);
        return id;
    }

    void certificate(UUID owner, LocalDate expiry) {
        jdbc.update("""
                insert into employee_certificate(id, legal_entity_id, employee_id, name, expires_at, created_at, updated_at)
                values (?, (select id from legal_entity), ?, 'Fictional Certificate', ?, now(), now())
                """, UUID.randomUUID(), owner, expiry);
    }

    void document(String type, LocalDate expiry) {
        jdbc.update("""
                insert into employee_expat_document(id, legal_entity_id, employee_id, document_type,
                    document_number, issuing_country, expires_at, created_at, updated_at)
                values (?, (select id from legal_entity), ?, ?, 'PRIVATE-NUMBER', 'VN', ?, now(), now())
                """, UUID.randomUUID(), employee, type, expiry);
    }

    void evaluation(UUID source, String outcome) {
        jdbc.update("""
                insert into probation_evaluation(id, legal_entity_id, employee_id, source_contract_id, evaluator_id,
                    starts_on, ends_on, outcome, notes, actor_id, created_at)
                values (?, (select id from legal_entity), ?, ?, ?, ?, ?, ?, 'Fictional outcome',
                    (select id from account where email = ?), now())
                """, UUID.randomUUID(), employee, source, employee, today.minusDays(80), today, outcome,
                TestAccounts.ADMIN_EMAIL);
    }

    void grant(String role, String permission) {
        UUID id = UUID.randomUUID();
        overrides.add(id);
        jdbc.update("""
                insert into role_permission_override(id, legal_entity_id, role, permission, granted)
                values (?, (select id from legal_entity), ?, ?, true)
                """, id, role, permission);
    }

    long auditCount() {
        return jdbc.queryForObject("select count(*) from audit_log where entity_type = 'EXPIRY_POLICY'", Long.class);
    }

    void resetPolicies() {
        jdbc.update("""
                update expiry_policy set advance_days = case document_type
                    when 'PROBATION' then 14 when 'VISA' then 60 when 'WORK_PERMIT' then 60 else 30 end
                """);
    }
}
