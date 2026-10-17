package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import java.time.Clock;
import java.time.LocalDate;
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
class ResignationApiIT {
    @Autowired MockMvcTester mvc;
    @Autowired TestAccounts accounts;
    @Autowired TestEmployees employees;
    @Autowired DataSource dataSource;
    @Autowired Clock clock;

    JdbcTemplate jdbc;
    UUID employeeId;
    String admin;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        employees.deleteAll();
        employeeId = employees.create("Fictional Departing Employee", null);
        admin = accounts.adminBearer(mvc);
    }

    @AfterEach
    void tearDown() {
        employees.deleteAll();
    }

    String path() { return "/api/employees/" + employeeId + "/resignation"; }
    String request(String date, String reason) {
        return "{\"lastWorkingDay\":\"" + date + "\",\"reason\":\"" + reason + "\"}";
    }
    MvcTestResult post(String bearer, String body) {
        return mvc.post().uri(path()).header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
    }

    @Test
    void resignationLocksLinkedAccountAndPreservesSearchableHistory() throws Exception {
        TestAccount linked = accounts.create(Role.EMPLOYEE);
        employees.link(linked.id(), employeeId);
        String oldBearer = accounts.bearer(mvc, linked);
        assertThat(mvc.get().uri("/api/employees?status=ALL").header("Authorization", admin).exchange())
                .bodyJson().extractingPath("$.total").isEqualTo(1);

        String lastDay = LocalDate.now(clock).minusDays(1).toString();
        MvcTestResult created = post(admin, request(lastDay, "Employee departure"));
        assertThat(created).hasStatus(201);
        String sourceId = JsonPath.read(created.getResponse().getContentAsString(), "$.sourceId");
        assertThat(created).bodyJson().extractingPath("$.kind").isEqualTo("RESIGNATION");
        assertThat(created).bodyJson().extractingPath("$.effectiveOn").isEqualTo(lastDay);
        assertThat(mvc.get().uri(path()).header("Authorization", admin).exchange())
                .bodyJson().extractingPath("$.sourceId").isEqualTo(sourceId);
        assertThat(mvc.get().uri("/api/employees/" + employeeId + "/work-history")
                .header("Authorization", admin).exchange())
                .bodyJson().extractingPath("$[0].kind").isEqualTo("RESIGNATION");
        assertThat(mvc.get().uri("/api/employees/" + employeeId)
                .header("Authorization", admin).exchange())
                .bodyJson().extractingPath("$.status").isEqualTo("INACTIVE");
        assertThat(mvc.get().uri("/api/employees").header("Authorization", admin).exchange())
                .bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(mvc.get().uri("/api/employees?status=INACTIVE").header("Authorization", admin).exchange())
                .bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(mvc.get().uri("/api/employees?status=ALL").header("Authorization", admin).exchange())
                .bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(jdbc.queryForObject("select status from account where id = ?", String.class, linked.id()))
                .isEqualTo("LOCKED");
        assertThat(mvc.post().uri("/api/accounts/" + linked.id() + "/unlock")
                .header("Authorization", admin).exchange()).hasStatus(409);
        assertThat(mvc.get().uri("/api/me").header("Authorization", oldBearer).exchange()).hasStatus(401);
        assertThat(mvc.post().uri("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + linked.email() + "\",\"password\":\""
                        + TestAccounts.PASSWORD + "\"}").exchange()).hasStatus(401);
        assertThat(mvc.get().uri("/api/audit-logs?entityType=RESIGNATION&entityId=" + employeeId)
                .header("Authorization", admin).exchange())
                .bodyJson().extractingPath("$.total").isEqualTo(1);
    }

    @Test
    void invalidDeniedAndRepeatedRequestsLeaveNoPartialWrites() {
        TestAccount linked = accounts.create(Role.EMPLOYEE);
        employees.link(linked.id(), employeeId);
        String employee = accounts.bearer(mvc, linked);
        String lastDay = LocalDate.now(clock).minusDays(1).toString();
        assertThat(post(employee, request(lastDay, "No permission"))).hasStatus(403);
        assertThat(post(admin, request("2019-12-31", "Before hire"))).hasStatus(400);
        assertThat(post(admin, request(LocalDate.now(clock).plusDays(1).toString(), "Future date"))).hasStatus(400);
        assertThat(post(admin, request(lastDay, "  "))).hasStatus(400);
        assertThat(jdbc.queryForObject("select count(*) from resignation where employee_id = ?",
                Integer.class, employeeId)).isZero();
        assertThat(jdbc.queryForObject("select status from employee where id = ?", String.class, employeeId))
                .isEqualTo("OFFICIAL");
        assertThat(jdbc.queryForObject("select status from account where id = ?", String.class, linked.id()))
                .isEqualTo("ACTIVE");
        assertThat(mvc.get().uri(path()).header("Authorization", admin).exchange()).hasStatus(404);
        assertThat(post(admin, request(lastDay, "Employee departure"))).hasStatus(201);
        assertThat(post(admin, request(lastDay, "Repeated"))).hasStatus(409);
        assertThat(jdbc.queryForObject("select count(*) from resignation where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(1);
    }

    @Test
    void backdatedDepartureCannotPrecedeExistingDecision() {
        LocalDate decisionDay = LocalDate.now(clock).minusDays(1);
        jdbc.update("""
                insert into work_decision(id, legal_entity_id, employee_id, decision_number, kind,
                    signed_on, effective_on, description, previous_position_id, position_id, actor_id, created_at)
                values (?, (select id from legal_entity), ?, ?, 'REWARD', ?, ?,
                    'Fictional reward', (select position_id from employee where id = ?),
                    (select position_id from employee where id = ?), ?, now())
                """, UUID.randomUUID(), employeeId, "QD-RESIGN-" + employeeId,
                decisionDay, decisionDay,
                employeeId, employeeId, UUID.randomUUID());
        assertThat(post(admin, request(decisionDay.minusDays(1).toString(), "Before decision"))).hasStatus(409);
        assertThat(jdbc.queryForObject("select status from employee where id = ?", String.class, employeeId))
                .isEqualTo("OFFICIAL");
        assertThat(jdbc.queryForObject("select count(*) from resignation where employee_id = ?",
                Integer.class, employeeId)).isZero();
        jdbc.update("delete from work_decision where employee_id = ?", employeeId);
    }
}
