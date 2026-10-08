package com.hrmdemo.controller.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Creating and editing Accounts and setting a temporary password, against real PostgreSQL. Each test names
 * its Accounts with a marker of its own, because the database is shared with the other tests.
 */
@IntegrationTest
class AccountAdminApiIT {

    static final String TEMPORARY = "Temp-2026-abc";

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    DataSource dataSource;
    @Autowired
    PlatformTransactionManager transactionManager;
    @Autowired
    TestEmployees testEmployees;

    JdbcTemplate jdbc;
    String admin;
    /** Part of every name and email this test creates; letters and digits only. */
    String marker;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        admin = testAccounts.adminBearer(mvc);
        marker = "zw" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    @AfterEach
    void cleanUp() {
        testEmployees.deleteAll();
    }

    // --- create ---

    @Test
    void theAdminCreatesAnAccountAndThePersonSignsInWithTheTemporaryPasswordAndChangesIt() {
        MvcTestResult created = create(admin, """
                {"fullName":"  Trần Thị Mai %s ","email":" Mai-%s@HRM.test ","roles":["HR","EMPLOYEE"],
                 "password":"%s","employeeId":null}""".formatted(marker, marker, TEMPORARY));

        assertThat(created).hasStatus(201);
        assertThat(created).bodyJson().extractingPath("$.fullName").isEqualTo("Trần Thị Mai " + marker);
        assertThat(created).bodyJson().extractingPath("$.email").isEqualTo(email("mai"));
        assertThat(created).bodyJson().extractingPath("$.roles").asArray().containsExactlyInAnyOrder("HR", "EMPLOYEE");
        assertThat(created).bodyJson().extractingPath("$.dataScope").isEqualTo("COMPANY");
        assertThat(created).bodyJson().extractingPath("$.status").isEqualTo("ACTIVE");
        assertThat(JsonPath.<Object>read(body(created), "$.employee")).isNull();
        assertThat(body(created)).doesNotContain(TEMPORARY).doesNotContain("password");
        String id = JsonPath.read(body(created), "$.id");

        // In the list, and found without accents.
        MvcTestResult found = list("tran thi mai " + marker);
        assertThat(JsonPath.<List<String>>read(body(found), "$.items[*].id")).containsExactly(id);

        MvcTestResult login = login(email("mai"), TEMPORARY);
        assertThat(login).hasStatusOk();
        String bearer = "Bearer " + JsonPath.<String>read(body(login), "$.accessToken");
        MvcTestResult me = mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
        assertThat(me).bodyJson().extractingPath("$.id").isEqualTo(id);
        assertThat(me).bodyJson().extractingPath("$.fullName").isEqualTo("Trần Thị Mai " + marker);

        MvcTestResult changed = mvc.post().uri("/api/auth/change-password")
                .header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"currentPassword":"%s","newPassword":"My-own-2026-xyz"}""".formatted(TEMPORARY))
                .exchange();
        assertThat(changed).hasStatus(204);
        assertThat(login(email("mai"), "My-own-2026-xyz")).as("their own password").hasStatusOk();
        assertThat(login(email("mai"), TEMPORARY)).as("the temporary password").hasStatus(401);
    }

    @Test
    void anEmailThatIsTakenIsRefusedWhateverTheCaseAndTheErrorNamesTheHolder() {
        String holderId = createdId("Lê Thị Hoa", "hoa", "EMPLOYEE");

        MvcTestResult duplicate = create(admin, json("Trần Thị Mai", "HOA-" + marker + "@Hrm.Test", "HR"));

        assertThat(duplicate).hasStatus(409);
        assertThat(duplicate).bodyJson().extractingPath("$.code").isEqualTo("account.email_taken");
        assertThat(duplicate).bodyJson().extractingPath("$.holder.id").isEqualTo(holderId);
        assertThat(duplicate).bodyJson().extractingPath("$.holder.fullName").isEqualTo("Lê Thị Hoa " + marker);
        assertThat(jdbc.queryForObject("select count(*) from account where email = ?", Long.class, email("hoa")))
                .isEqualTo(1);
    }

    @Test
    void anAccountIsLinkedToAnActiveEmployeeWhoThenShowsOnTheAccountAndInMe() {
        UUID employeeId = testEmployees.create("Trần Thị Mai " + marker, null);

        MvcTestResult created = create(admin, """
                {"fullName":"Trần Thị Mai","email":"%s","roles":["HR"],"password":"%s","employeeId":"%s"}"""
                .formatted(email("mai"), TEMPORARY, employeeId));

        assertThat(created).hasStatus(201);
        assertThat(created).bodyJson().extractingPath("$.employee.employeeId").isEqualTo(employeeId.toString());
        assertThat(created).bodyJson().extractingPath("$.employee.fullName").isEqualTo("Trần Thị Mai " + marker);
        assertThat(created).bodyJson().extractingPath("$.employee.employeeCode").asString().matches("NV\\d{7}");
        assertThat(created).bodyJson().extractingPath("$.employee.status").isEqualTo("OFFICIAL");
        assertThat(JsonPath.<Object>read(body(created), "$.employee.orgUnitName")).as("directly under the company")
                .isNull();
        String id = JsonPath.read(body(created), "$.id");
        assertThat(JsonPath.<List<String>>read(body(list(marker)), "$.items[*].employee.employeeId"))
                .containsExactly(employeeId.toString());

        String bearer = "Bearer " + JsonPath.<String>read(body(login(email("mai"), TEMPORARY)), "$.accessToken");
        MvcTestResult me = mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
        assertThat(me).bodyJson().extractingPath("$.id").isEqualTo(id);
        assertThat(me).bodyJson().extractingPath("$.employeeId").isEqualTo(employeeId.toString());
    }

    @Test
    void anUnknownOrInactiveEmployeeCannotBeLinked() {
        UUID left = testEmployees.create("Lê Thị Hoa " + marker, null, "INACTIVE");

        for (UUID employeeId : List.of(UUID.randomUUID(), left)) {
            MvcTestResult created = create(admin, """
                    {"fullName":"Trần Thị Mai","email":"%s","roles":["HR"],"password":"%s","employeeId":"%s"}"""
                    .formatted(email("mai"), TEMPORARY, employeeId));

            assertThat(created).hasStatus(400);
            assertThat(created).bodyJson().extractingPath("$.code").isEqualTo("account.employee_not_found");
        }
        assertThat(login(email("mai"), TEMPORARY)).as("nothing was created").hasStatus(401);
    }

    @Test
    void anEmployeeLinkedToAnotherAccountIsAConflictThatNamesThatAccount() {
        UUID employeeId = testEmployees.create("Trần Thị Mai " + marker, null);
        MvcTestResult first = create(admin, """
                {"fullName":"Trần Thị Mai %s","email":"%s","roles":["HR"],"password":"%s","employeeId":"%s"}"""
                .formatted(marker, email("mai"), TEMPORARY, employeeId));
        String holderId = JsonPath.read(body(first), "$.id");
        String other = createdId("Lê Thị Hoa", "hoa", "EMPLOYEE");

        MvcTestResult created = create(admin, """
                {"fullName":"Trần Thị Mai","email":"%s","roles":["HR"],"password":"%s","employeeId":"%s"}"""
                .formatted(email("mai2"), TEMPORARY, employeeId));
        MvcTestResult edited = update(admin, other, """
                {"fullName":"Lê Thị Hoa","email":"%s","roles":["EMPLOYEE"],"employeeId":"%s"}"""
                .formatted(email("hoa"), employeeId));

        for (MvcTestResult taken : List.of(created, edited)) {
            assertThat(taken).hasStatus(409);
            assertThat(taken).bodyJson().extractingPath("$.code").isEqualTo("account.employee_taken");
            assertThat(taken).bodyJson().extractingPath("$.holder.id").isEqualTo(holderId);
            assertThat(taken).bodyJson().extractingPath("$.holder.fullName").isEqualTo("Trần Thị Mai " + marker);
        }
        // The holder itself saves the same link again without a conflict.
        assertThat(update(admin, holderId, """
                {"fullName":"Trần Thị Mai","email":"%s","roles":["HR"],"employeeId":"%s"}"""
                .formatted(email("mai"), employeeId))).hasStatusOk();
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "fullName | {\"fullName\":\" \",\"email\":\"a@hrm.test\",\"roles\":[\"HR\"],\"password\":\"Temp-2026-abc\"}",
        "email | {\"fullName\":\"Mai\",\"email\":\"not-an-email\",\"roles\":[\"HR\"],\"password\":\"Temp-2026-abc\"}",
        "roles | {\"fullName\":\"Mai\",\"email\":\"a@hrm.test\",\"roles\":[],\"password\":\"Temp-2026-abc\"}",
        "roles | {\"fullName\":\"Mai\",\"email\":\"a@hrm.test\",\"password\":\"Temp-2026-abc\"}",
        "roles | {\"fullName\":\"Mai\",\"email\":\"a@hrm.test\",\"roles\":[\"BOSS\"],\"password\":\"Temp-2026-abc\"}",
        "password | {\"fullName\":\"Mai\",\"email\":\"a@hrm.test\",\"roles\":[\"HR\"],\"password\":\"short\"}",
        "password | {\"fullName\":\"Mai\",\"email\":\"a@hrm.test\",\"roles\":[\"HR\"]}"})
    void anInvalidNewAccountIsRefusedAndTheErrorNamesTheField(String field, String json) {
        MvcTestResult result = create(admin, json);

        assertThat(result).hasStatus(400);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(JsonPath.<List<String>>read(body(result), "$.errors[*].field")).contains(field);
    }

    @Test
    void aNameOverAHundredCharactersIsRefused() {
        MvcTestResult result = create(admin, json("a".repeat(101), email("long"), "HR"));

        assertThat(result).hasStatus(400);
        assertThat(JsonPath.<List<String>>read(body(result), "$.errors[*].field")).containsExactly("fullName");
        assertThat(create(admin, json("a".repeat(100), email("long"), "HR"))).hasStatus(201);
    }

    // --- edit ---

    @Test
    void editingChangesNameEmailAndRolesAndLeavesStatusAndPasswordAlone() {
        String id = createdId("Trần Thị Mai", "mai", "HR", "EMPLOYEE");

        MvcTestResult edited = update(admin, id, """
                {"fullName":"Đỗ Thị Mai %s","email":"Mai.Do-%s@hrm.test","roles":["EMPLOYEE","LINE_MANAGER"],
                 "employeeId":null}""".formatted(marker, marker));

        assertThat(edited).hasStatusOk();
        assertThat(edited).bodyJson().extractingPath("$.id").isEqualTo(id);
        assertThat(edited).bodyJson().extractingPath("$.fullName").isEqualTo("Đỗ Thị Mai " + marker);
        assertThat(edited).bodyJson().extractingPath("$.email").isEqualTo(email("mai.do"));
        assertThat(edited).bodyJson().extractingPath("$.roles").asArray()
                .containsExactlyInAnyOrder("EMPLOYEE", "LINE_MANAGER");
        assertThat(edited).bodyJson().extractingPath("$.dataScope").isEqualTo("ORG_UNIT");
        assertThat(edited).bodyJson().extractingPath("$.status").isEqualTo("ACTIVE");

        // Read back: the change is stored, the search follows the new name and email and forgets the old ones.
        MvcTestResult stored = mvc.get().uri("/api/accounts/{id}", id)
                .header(HttpHeaders.AUTHORIZATION, admin).exchange();
        assertThat(stored).bodyJson().extractingPath("$.fullName").isEqualTo("Đỗ Thị Mai " + marker);
        assertThat(stored).bodyJson().extractingPath("$.roles").asArray()
                .containsExactlyInAnyOrder("EMPLOYEE", "LINE_MANAGER");
        assertThat(JsonPath.<List<String>>read(body(list("do thi mai " + marker)), "$.items[*].id"))
                .containsExactly(id);
        assertThat(JsonPath.<List<String>>read(body(list("mai.do-" + marker)), "$.items[*].id")).containsExactly(id);
        assertThat(JsonPath.<List<String>>read(body(list("tran thi mai " + marker)), "$.items[*].id")).isEmpty();
        assertThat(JsonPath.<List<String>>read(body(list("mai-" + marker + "@")), "$.items[*].id")).isEmpty();

        // The password is the same; the person signs in with the new email and no longer with the old one.
        assertThat(login(email("mai.do"), TEMPORARY)).hasStatusOk();
        assertThat(login(email("mai"), TEMPORARY)).hasStatus(401);
    }

    @Test
    void editingKeepsTheSessionAndTheNewRolesShowInMeAtOnce() {
        String id = createdId("Trần Thị Mai", "mai", "EMPLOYEE");
        MvcTestResult login = login(email("mai"), TEMPORARY);
        Cookie cookie = login.getResponse().getCookie("refresh_token");
        String bearer = "Bearer " + JsonPath.<String>read(body(login), "$.accessToken");

        assertThat(update(admin, id, editJson("Trần Thị Mai", email("mai"), "HR"))).hasStatusOk();

        MvcTestResult me = mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
        assertThat(me).bodyJson().extractingPath("$.roles").asArray().containsExactly("HR");
        assertThat(me).bodyJson().extractingPath("$.dataScope").isEqualTo("COMPANY");
        assertThat(mvc.post().uri("/api/auth/refresh").cookie(cookie)).as("the session is kept").hasStatusOk();
    }

    @Test
    void editingCannotTakeAnEmailOfAnotherAccountButMayKeepItsOwn() {
        String hoa = createdId("Lê Thị Hoa", "hoa", "EMPLOYEE");
        String mai = createdId("Trần Thị Mai", "mai", "HR");

        MvcTestResult taken = update(admin, mai, editJson("Trần Thị Mai", "HOA-" + marker + "@hrm.test", "HR"));
        assertThat(taken).hasStatus(409);
        assertThat(taken).bodyJson().extractingPath("$.code").isEqualTo("account.email_taken");
        assertThat(taken).bodyJson().extractingPath("$.holder.id").isEqualTo(hoa);
        assertThat(taken).bodyJson().extractingPath("$.holder.fullName").isEqualTo("Lê Thị Hoa " + marker);

        MvcTestResult same = update(admin, mai, editJson("Trần Thị Mai Anh", "MAI-" + marker + "@hrm.test", "HR"));
        assertThat(same).hasStatusOk();
        assertThat(same).bodyJson().extractingPath("$.email").isEqualTo(email("mai"));
    }

    @Test
    void editingRefusesAnUnknownEmployeeAnUnknownAccountAndAnInvalidBody() {
        String id = createdId("Trần Thị Mai", "mai", "HR");

        MvcTestResult employee = update(admin, id, """
                {"fullName":"Mai","email":"%s","roles":["HR"],"employeeId":"%s"}"""
                .formatted(email("mai"), UUID.randomUUID()));
        assertThat(employee).hasStatus(400);
        assertThat(employee).bodyJson().extractingPath("$.code").isEqualTo("account.employee_not_found");

        MvcTestResult unknown = update(admin, UUID.randomUUID().toString(), editJson("Mai", email("x"), "HR"));
        assertThat(unknown).hasStatus(404);
        assertThat(unknown).bodyJson().extractingPath("$.code").isEqualTo("account.not_found");

        MvcTestResult invalid = update(admin, id, """
                {"fullName":"","email":"nope","roles":["BOSS"]}""");
        assertThat(invalid).hasStatus(400);
        assertThat(invalid).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(JsonPath.<List<String>>read(body(invalid), "$.errors[*].field")).contains("fullName", "email");

        MvcTestResult unknownRole = update(admin, id, editJson("Mai", email("mai"), "BOSS"));
        assertThat(unknownRole).hasStatus(400);
        assertThat(unknownRole).bodyJson().extractingPath("$.errors[0].field").isEqualTo("roles");
    }

    // --- the last active Admin ---

    @Test
    void anAdminGivesUpTheirOwnAdminRoleWhileAnotherActiveAdminExists() {
        // The seeded Admin is the other active Admin.
        TestAccount second = testAccounts.create("Đỗ Minh Quân " + marker, email("quan"), Role.ADMIN);
        String secondBearer = testAccounts.bearer(mvc, second);

        MvcTestResult edited = update(secondBearer, second.id().toString(),
                editJson("Đỗ Minh Quân " + marker, email("quan"), "HR"));

        assertThat(edited).hasStatusOk();
        assertThat(edited).bodyJson().extractingPath("$.roles").asArray().containsExactly("HR");
        MvcTestResult me = mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, secondBearer).exchange();
        assertThat(me).bodyJson().extractingPath("$.roles").asArray().containsExactly("HR");
        assertThat(me).bodyJson().extractingPath("$.permissions").asArray().doesNotContain("ACCOUNT_EDIT");
    }

    @Test
    void theAdminRoleCannotBeRemovedFromTheLastActiveAdmin() {
        TestAccount only = testAccounts.create("Đỗ Minh Quân " + marker, email("quan"), Role.ADMIN, Role.EMPLOYEE);
        String onlyBearer = testAccounts.bearer(mvc, only);
        // Other tests leave active Admins behind (the seeded one at least). Inside a transaction that is rolled
        // back, lock them all, so this Account is the last one; the request runs in the same transaction.
        var transaction = new TransactionTemplate(transactionManager);
        transaction.executeWithoutResult(status -> {
            status.setRollbackOnly();
            jdbc.update("""
                    update account set status = 'LOCKED'
                    where id <> ? and id in (select account_id from account_role where role = 'ADMIN')""",
                    only.id());

            MvcTestResult refused = update(onlyBearer, only.id().toString(),
                    editJson("Đỗ Minh Quân " + marker, email("quan"), "EMPLOYEE"));

            assertThat(refused).hasStatus(409);
            assertThat(refused).bodyJson().extractingPath("$.code").isEqualTo("account.last_admin");
            // Keeping the role is still fine for the last Admin.
            assertThat(update(onlyBearer, only.id().toString(),
                    editJson("Đỗ Minh Quân " + marker, email("quan"), "ADMIN", "HR"))).hasStatusOk();
        });

        assertThat(jdbc.queryForList("select role from account_role where account_id = ?", String.class, only.id()))
                .as("rolled back with the rest").containsExactlyInAnyOrder("ADMIN", "EMPLOYEE");
    }

    // --- temporary password ---

    @Test
    void aPasswordSetByTheAdminReplacesTheOldOneAndEndsTheSessions() {
        String id = createdId("Trần Thị Mai", "mai", "HR");
        MvcTestResult login = login(email("mai"), TEMPORARY);
        Cookie cookie = login.getResponse().getCookie("refresh_token");
        assertThat(cookie).isNotNull();

        MvcTestResult set = setPassword(admin, id, "New-temp-2026");

        assertThat(set).hasStatus(204);
        assertThat(login(email("mai"), TEMPORARY)).as("the old password").hasStatus(401);
        MvcTestResult refresh = mvc.post().uri("/api/auth/refresh").cookie(cookie).exchange();
        assertThat(refresh).as("the old refresh token").hasStatus(401);
        assertThat(login(email("mai"), "New-temp-2026")).as("the new password").hasStatusOk();
    }

    @Test
    void aPasswordSetOnALockedAccountLeavesItLocked() {
        String id = createdId("Trần Thị Mai", "mai", "HR");
        jdbc.update("update account set status = 'LOCKED' where id = ?", UUID.fromString(id));

        assertThat(setPassword(admin, id, "New-temp-2026")).hasStatus(204);

        MvcTestResult login = login(email("mai"), "New-temp-2026");
        assertThat(login).hasStatus(401);
        assertThat(login).bodyJson().extractingPath("$.code").isEqualTo("auth.account_locked");
        assertThat(mvc.get().uri("/api/accounts/{id}", id).header(HttpHeaders.AUTHORIZATION, admin))
                .bodyJson().extractingPath("$.status").isEqualTo("LOCKED");
    }

    @Test
    void theAdminCannotSetTheirOwnPasswordThisWay() {
        TestAccount second = testAccounts.create("Đỗ Minh Quân " + marker, email("quan"), Role.ADMIN);

        MvcTestResult own = setPassword(testAccounts.bearer(mvc, second), second.id().toString(), "New-temp-2026");

        assertThat(own).hasStatus(409);
        assertThat(own).bodyJson().extractingPath("$.code").isEqualTo("account.cannot_set_own_password");
        assertThat(login(email("quan"), TestAccounts.PASSWORD)).as("the password is unchanged").hasStatusOk();
    }

    @Test
    void settingAPasswordRefusesAnUnknownAccountAndAPasswordOutsideThePolicy() {
        String id = createdId("Trần Thị Mai", "mai", "HR");

        MvcTestResult unknown = setPassword(admin, UUID.randomUUID().toString(), "New-temp-2026");
        assertThat(unknown).hasStatus(404);
        assertThat(unknown).bodyJson().extractingPath("$.code").isEqualTo("account.not_found");

        for (String password : List.of("short", "x".repeat(73))) {
            MvcTestResult invalid = setPassword(admin, id, password);
            assertThat(invalid).hasStatus(400);
            assertThat(invalid).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
            assertThat(invalid).bodyJson().extractingPath("$.errors[0].field").isEqualTo("password");
        }
        assertThat(login(email("mai"), TEMPORARY)).as("the password is unchanged").hasStatusOk();
    }

    // --- permission ---

    @Test
    void onlyAnAccountThatMayEditAccountsCreatesEditsOrSetsAPassword() {
        String id = createdId("Trần Thị Mai", "mai", "EMPLOYEE");
        String hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));

        List<MvcTestResult> denied = List.of(
                create(hr, json("Lê Thị Hoa", email("hoa"), "EMPLOYEE")),
                update(hr, id, editJson("Lê Thị Hoa", email("mai"), "ADMIN")),
                setPassword(hr, id, "New-temp-2026"));

        for (MvcTestResult result : denied) {
            assertThat(result).hasStatus(403);
            assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
        }
        assertThat(login(email("hoa"), TEMPORARY)).as("nothing was created").hasStatus(401);
        assertThat(login(email("mai"), TEMPORARY)).as("the password is unchanged").hasStatusOk();
        assertThat(mvc.get().uri("/api/accounts/{id}", id).header(HttpHeaders.AUTHORIZATION, admin))
                .bodyJson().extractingPath("$.roles").asArray().containsExactly("EMPLOYEE");

        assertThat(mvc.post().uri("/api/accounts").contentType(MediaType.APPLICATION_JSON)
                .content(json("Lê Thị Hoa", email("hoa"), "EMPLOYEE"))).as("signed out").hasStatus(401);
    }

    // --- helpers ---

    /** Creates "{name} {marker}" with the email "{emailPrefix}-{marker}@hrm.test" through the API; its id. */
    private String createdId(String name, String emailPrefix, String... roles) {
        MvcTestResult created = create(admin, json(name + " " + marker, email(emailPrefix), roles));
        assertThat(created).hasStatus(201);
        return JsonPath.read(body(created), "$.id");
    }

    private String email(String prefix) {
        return prefix + "-" + marker + "@hrm.test";
    }

    /** A create body with the temporary password. */
    private static String json(String fullName, String email, String... roles) {
        return """
                {"fullName":"%s","email":"%s","roles":["%s"],"password":"%s"}"""
                .formatted(fullName, email, String.join("\",\"", roles), TEMPORARY);
    }

    /** An edit body. */
    private static String editJson(String fullName, String email, String... roles) {
        return """
                {"fullName":"%s","email":"%s","roles":["%s"],"employeeId":null}"""
                .formatted(fullName, email, String.join("\",\"", roles));
    }

    private MvcTestResult create(String bearer, String json) {
        return mvc.post().uri("/api/accounts").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult update(String bearer, String id, String json) {
        return mvc.put().uri("/api/accounts/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult setPassword(String bearer, String id, String password) {
        return mvc.put().uri("/api/accounts/{id}/password", id).header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"password":"%s"}""".formatted(password))
                .exchange();
    }

    private MvcTestResult login(String email, String password) {
        return mvc.post().uri("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"%s"}""".formatted(email, password))
                .exchange();
    }

    private MvcTestResult list(String q) {
        return mvc.get().uri("/api/accounts").param("q", q).header(HttpHeaders.AUTHORIZATION, admin).exchange();
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
