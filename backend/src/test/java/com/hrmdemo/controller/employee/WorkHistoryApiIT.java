package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.TestAccounts.TestAccount;
import com.hrmdemo.entity.orgunit.OrgUnit;
import com.hrmdemo.entity.orgunit.OrgUnitType;
import com.hrmdemo.repository.orgunit.OrgUnitRepository;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
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
class WorkHistoryApiIT {
    @Autowired MockMvcTester mvc;
    @Autowired TestAccounts accounts;
    @Autowired TestEmployees employees;
    @Autowired OrgUnitRepository units;
    @Autowired DataSource dataSource;

    JdbcTemplate jdbc;
    UUID employeeId;
    UUID oldPosition;
    String admin;
    final List<OrgUnit> savedUnits = new ArrayList<>();
    UUID permissionOverride;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        employees.deleteAll();
        employeeId = employees.create("Fictional Work History Employee", null);
        oldPosition = jdbc.queryForObject("select position_id from employee where id = ?", UUID.class, employeeId);
        admin = accounts.adminBearer(mvc);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("delete from work_decision where employee_id = ?", employeeId);
        employees.deleteAll();
        units.deleteAllInBatch(savedUnits);
        if (permissionOverride != null) jdbc.update("delete from role_permission_override where id = ?", permissionOverride);
    }

    String path() { return "/api/employees/" + employeeId + "/work-history"; }

    MvcTestResult post(String bearer, String body) {
        return mvc.post().uri(path()).header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
    }

    String request(String number, String kind, UUID unitId, UUID positionId) {
        return """
                {"decisionNumber":"%s","kind":"%s","signedOn":"2020-01-30",
                 "effectiveOn":"2020-02-01","description":"Signed decision",
                 "orgUnitId":%s,"positionId":%s}
                """.formatted(number, kind, unitId == null ? "null" : "\"" + unitId + "\"",
                positionId == null ? "null" : "\"" + positionId + "\"");
    }

    @Test
    void promotionChangesPositionAndKeepsAnImmutableSourceMilestone() throws Exception {
        UUID newPosition = employees.position();
        MvcTestResult created = post(admin, request("QD-PROMOTE-" + employeeId, "PROMOTION", null, newPosition));
        assertThat(created).hasStatus(201);
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.sourceId");
        assertThat(created).bodyJson().extractingPath("$.previousPositionId").isEqualTo(oldPosition.toString());
        assertThat(created).bodyJson().extractingPath("$.positionId").isEqualTo(newPosition.toString());
        assertThat(created).bodyJson().extractingPath("$.actorId").isNotNull();
        assertThat(jdbc.queryForObject("select position_id from employee where id = ?", UUID.class, employeeId))
                .isEqualTo(newPosition);

        MvcTestResult history = mvc.get().uri(path()).header("Authorization", admin).exchange();
        assertThat(history).bodyJson().extractingPath("$[0].sourceId").isEqualTo(id);
        assertThat(history).bodyJson().extractingPath("$[0].kind").isEqualTo("PROMOTION");
        assertThat(history).bodyJson().extractingPath("$[0].effectiveOn").isEqualTo("2020-02-01");
        assertThat(history).bodyJson().extractingPath("$[1].kind").isEqualTo("HIRE");
        MvcTestResult audit = mvc.get().uri("/api/audit-logs?entityType=WORK_HISTORY&entityId=" + employeeId)
                .header("Authorization", admin).exchange();
        assertThat(audit).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(audit).bodyJson().extractingPath("$.items[0].action").isEqualTo("CREATE");
        assertThat(post(admin, request("QD-PROMOTE-" + employeeId, "PROMOTION", null, oldPosition)))
                .hasStatus(409);
        assertThat(jdbc.queryForObject("select count(*) from work_decision where employee_id = ?",
                Integer.class, employeeId)).isEqualTo(1);
    }

    @Test
    void transferUpdatesUnitButInvalidOrDeniedChangesLeaveNoDocument() {
        OrgUnit unit = saveUnit();
        String denied = accounts.bearer(mvc, accounts.create(Role.EMPLOYEE));
        assertThat(post(denied, request("QD-DENIED-" + employeeId, "TRANSFER", unit.getId(), null)))
                .hasStatus(403);
        assertThat(post(admin, request("QD-BAD-" + employeeId, "PROMOTION", null, UUID.randomUUID())))
                .hasStatus(400);
        assertThat(jdbc.queryForObject("select count(*) from work_decision where employee_id = ?",
                Integer.class, employeeId)).isZero();
        assertThat(jdbc.queryForObject("select org_unit_id from employee where id = ?", UUID.class, employeeId))
                .isNull();

        assertThat(post(admin, request("QD-TRANSFER-" + employeeId, "TRANSFER", unit.getId(), null)))
                .hasStatus(201);
        assertThat(jdbc.queryForObject("select org_unit_id from employee where id = ?", UUID.class, employeeId))
                .isEqualTo(unit.getId());
        assertThat(mvc.get().uri(path()).header("Authorization", denied).exchange()).hasStatus(403);
    }

    @Test
    void managerCannotTransferMemberOutsideManagedUnitsAndExplicitManagerIsPreserved() {
        OrgUnit source = saveUnit();
        OrgUnit target = saveUnit();
        jdbc.update("update employee set org_unit_id = ? where id = ?", source.getId(), employeeId);
        UUID head = employees.create("Fictional Head", source.getId());
        employees.makeHead(source.getId(), head);
        jdbc.update("update employee set manager_id = ? where id = ?", head, employeeId);
        TestAccount account = accounts.create(Role.LINE_MANAGER, Role.EMPLOYEE);
        employees.link(account.id(), head);
        permissionOverride = UUID.randomUUID();
        jdbc.update("""
                insert into role_permission_override(id, legal_entity_id, role, permission, granted)
                values (?, (select id from legal_entity), 'LINE_MANAGER', 'EMPLOYEE_EDIT', true)
                """, permissionOverride);
        String manager = accounts.bearer(mvc, account);
        assertThat(mvc.get().uri(path()).header("Authorization", manager).exchange()).hasStatusOk();
        assertThat(post(manager, request("QD-OUT-" + employeeId, "TRANSFER", target.getId(), null)))
                .hasStatus(403);
        assertThat(jdbc.queryForObject("select count(*) from work_decision where employee_id = ?",
                Integer.class, employeeId)).isZero();
        assertThat(jdbc.queryForObject("select org_unit_id from employee where id = ?", UUID.class, employeeId))
                .isEqualTo(source.getId());

        assertThat(post(admin, request("QD-IN-" + employeeId, "TRANSFER", target.getId(), null)))
                .hasStatus(201);
        assertThat(jdbc.queryForObject("select manager_id from employee where id = ?", UUID.class, employeeId))
                .isEqualTo(head);
        assertThat(mvc.get().uri(path()).header("Authorization", manager).exchange()).hasStatus(403);
    }

    private OrgUnit saveUnit() {
        OrgUnit saved = units.save(new OrgUnit(null, "WORK" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT),
                "Work history target", OrgUnitType.DEPARTMENT, null, 0, Instant.now()));
        savedUnits.add(saved);
        return saved;
    }
}
