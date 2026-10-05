package com.hrmdemo.service.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * The demo personas against real PostgreSQL, with {@code hrm.demo-personas.enabled} on (its own Spring
 * context). Each test starts with the seven personas as the seeder makes them and removes them afterwards,
 * so tests that run with the flag off never meet them.
 */
@IntegrationTest
@TestPropertySource(properties = "hrm.demo-personas.enabled=true")
class DemoPersonaSeederIT {

    @Autowired
    DemoPersonaSeeder seeder;
    @Autowired
    ApplicationContext context;
    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    DataSource dataSource;
    @Autowired
    PlatformTransactionManager transactionManager;

    JdbcTemplate jdbc;
    String admin;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        removePersonas();
        seeder.run(null);
        admin = testAccounts.adminBearer(mvc);
    }

    @AfterEach
    void removePersonas() {
        // Roles and tokens go with the Accounts (on delete cascade).
        new JdbcTemplate(dataSource).update("delete from account where demo_persona is not null");
    }

    @Test
    void withTheFlagOnTheSeederExistsAndTheShutoffDoesNot() {
        assertThat(context.getBeanNamesForType(DemoPersonaSeeder.class)).hasSize(1);
        assertThat(context.getBeanNamesForType(DemoPersonaShutoff.class)).isEmpty();
    }

    @Test
    void theSevenPersonasExistWithTheAgreedNamesEmailsRolesAndScope() {
        assertThat(jdbc.queryForList("""
                select a.demo_persona || ' | ' || a.full_name || ' | ' || a.email || ' | ' || a.status || ' | '
                       || (select string_agg(r.role, ',' order by r.role) from account_role r
                           where r.account_id = a.id)
                from account a where a.demo_persona is not null order by a.email""", String.class))
                .containsExactly(
                        "ACCOUNTANT | Hoàng Thị Thu | demo.accountant@hrm.local | ACTIVE | ACCOUNTANT,EMPLOYEE",
                        "ADMIN | Đỗ Minh Quân | demo.admin@hrm.local | ACTIVE | ADMIN",
                        "DIRECTOR | Phạm Quốc Bảo | demo.director@hrm.local | ACTIVE | DIRECTOR,EMPLOYEE",
                        "EMPLOYEE | Nguyễn Văn An | demo.employee@hrm.local | ACTIVE | EMPLOYEE",
                        "HR | Trần Thị Mai | demo.hr@hrm.local | ACTIVE | EMPLOYEE,HR",
                        "LINE_MANAGER | Lê Văn Hùng | demo.line-manager@hrm.local | ACTIVE | EMPLOYEE,LINE_MANAGER",
                        "PROJECT_MANAGER | Vũ Thị Lan | demo.project-manager@hrm.local | ACTIVE | "
                                + "EMPLOYEE,PROJECT_MANAGER");

        // In the Account list they carry their persona key and are found by name without accents.
        MvcTestResult manager = list("le van hung demo.line-manager");
        assertThat(manager).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(manager).bodyJson().extractingPath("$.items[0].demoPersona").isEqualTo("LINE_MANAGER");
        assertThat(manager).bodyJson().extractingPath("$.items[0].dataScope").isEqualTo("ORG_UNIT");
        assertThat(manager).bodyJson().extractingPath("$.items[0].fullName").isEqualTo("Lê Văn Hùng");
        // An ordinary Account has none.
        assertThat(JsonPath.<Object>read(body(list("quan tri vien")), "$.items[0].demoPersona")).isNull();
    }

    @Test
    void aPersonaCannotSignInWithAPasswordAnyoneKnows() {
        for (String guess : List.of("admin12345", "test-admin-password", TestAccounts.PASSWORD, "demo.admin")) {
            assertThat(login("demo.admin@hrm.local", guess)).hasStatus(401);
        }
        assertThat(jdbc.queryForObject("select count(distinct password_hash) from account "
                + "where demo_persona is not null", Long.class)).isEqualTo(7);
    }

    @Test
    void seedingAgainCreatesNoDuplicateAndLeavesALockedPersonaLocked() {
        String hr = personaId("HR");
        assertThat(post(admin, "/api/accounts/" + hr + "/lock")).hasStatusOk();

        seeder.run(null);

        assertThat(jdbc.queryForObject("select count(*) from account where demo_persona is not null", Long.class))
                .isEqualTo(7);
        assertThat(jdbc.queryForObject("select status from account where id = ?", String.class,
                UUID.fromString(hr))).as("the Admin's lock survives a restart").isEqualTo("LOCKED");
    }

    @Test
    void aMissingPersonaIsCreatedAgain() {
        jdbc.update("delete from account where demo_persona = 'DIRECTOR'");

        seeder.run(null);

        assertThat(jdbc.queryForObject("select full_name from account where demo_persona = 'DIRECTOR'",
                String.class)).isEqualTo("Phạm Quốc Bảo");
    }

    @Test
    void aPersonaAccountCannotBeEditedOrGivenAPasswordButCanBeLockedAndUnlocked() {
        String hr = personaId("HR");

        MvcTestResult edited = mvc.put().uri("/api/accounts/{id}", hr).header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"fullName":"Someone Else","email":"else@hrm.test","roles":["ADMIN"],"employeeId":null}""")
                .exchange();
        assertThat(edited).hasStatus(409);
        assertThat(edited).bodyJson().extractingPath("$.code").isEqualTo("account.demo_persona_not_editable");

        MvcTestResult password = mvc.put().uri("/api/accounts/{id}/password", hr)
                .header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"password":"Known-2026-abc"}""")
                .exchange();
        assertThat(password).hasStatus(409);
        assertThat(password).bodyJson().extractingPath("$.code").isEqualTo("account.demo_persona_not_editable");
        assertThat(login("demo.hr@hrm.local", "Known-2026-abc")).hasStatus(401);
        assertThat(jdbc.queryForObject("select full_name || ' ' || email from account where id = ?", String.class,
                UUID.fromString(hr))).isEqualTo("Trần Thị Mai demo.hr@hrm.local");

        MvcTestResult locked = post(admin, "/api/accounts/" + hr + "/lock");
        assertThat(locked).hasStatusOk();
        assertThat(locked).bodyJson().extractingPath("$.status").isEqualTo("LOCKED");
        assertThat(locked).bodyJson().extractingPath("$.demoPersona").isEqualTo("HR");
        assertThat(post(admin, "/api/accounts/" + hr + "/unlock")).bodyJson().extractingPath("$.status")
                .isEqualTo("ACTIVE");
    }

    @Test
    void theLastRealAdminCannotBeLockedOrDemotedWhileOnlyTheAdminPersonaWouldRemain() {
        String marker = "zp" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        TestAccount last = testAccounts.create("Last Admin " + marker, "last-" + marker + "@hrm.test", Role.ADMIN);
        TestAccount other = testAccounts.create("Other Admin " + marker, "other-" + marker + "@hrm.test",
                Role.ADMIN);
        String lastBearer = testAccounts.bearer(mvc, last);
        String otherBearer = testAccounts.bearer(mvc, other);
        // Inside a transaction that is rolled back: every ordinary Admin but one is locked, the Admin persona
        // stays active. The requests run in that transaction.
        var transaction = new TransactionTemplate(transactionManager);
        transaction.executeWithoutResult(status -> {
            status.setRollbackOnly();
            jdbc.update("""
                    update account set status = 'LOCKED'
                    where id <> ? and demo_persona is null
                      and id in (select account_id from account_role where role = 'ADMIN')""", last.id());
            assertThat(jdbc.queryForObject("select status from account where demo_persona = 'ADMIN'",
                    String.class)).isEqualTo("ACTIVE");

            // Asked by the other Admin, whose token still says ADMIN.
            MvcTestResult lock = post(otherBearer, "/api/accounts/" + last.id() + "/lock");
            assertThat(lock).hasStatus(409);
            assertThat(lock).bodyJson().extractingPath("$.code").isEqualTo("account.last_admin");

            MvcTestResult demote = mvc.put().uri("/api/accounts/{id}", last.id())
                    .header(HttpHeaders.AUTHORIZATION, lastBearer)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {"fullName":"Last Admin","email":"last-%s@hrm.test","roles":["HR"],"employeeId":null}"""
                            .formatted(marker))
                    .exchange();
            assertThat(demote).hasStatus(409);
            assertThat(demote).bodyJson().extractingPath("$.code").isEqualTo("account.last_admin");

            // The Admin persona itself may be locked: it is not one of the Admins the rule protects.
            assertThat(post(lastBearer, "/api/accounts/" + personaId("ADMIN") + "/lock")).hasStatusOk();
        });
    }

    private String personaId(String persona) {
        return jdbc.queryForObject("select id from account where demo_persona = ?", UUID.class, persona).toString();
    }

    private MvcTestResult post(String bearer, String path) {
        return mvc.post().uri(path).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    private MvcTestResult list(String q) {
        return mvc.get().uri("/api/accounts").param("q", q).header(HttpHeaders.AUTHORIZATION, admin).exchange();
    }

    private MvcTestResult login(String email, String password) {
        return mvc.post().uri("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"%s"}""".formatted(email, password))
                .exchange();
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
