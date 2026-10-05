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
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Locking and unlocking Accounts against real PostgreSQL. Each test names its Accounts with a marker of its
 * own, because the database is shared with the other tests.
 */
@IntegrationTest
class AccountLockApiIT {

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
    /** Part of every name and email this test creates; letters and digits only. */
    String marker;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        admin = testAccounts.adminBearer(mvc);
        marker = "zl" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    @Test
    void aLockedAccountCannotSignInAndItsSessionIsEnded() {
        TestAccount mai = create("Trần Thị Mai", "mai", Role.HR);
        MvcTestResult login = login(mai);
        assertThat(login).hasStatusOk();
        Cookie cookie = login.getResponse().getCookie("refresh_token");
        String bearer = "Bearer " + JsonPath.<String>read(body(login), "$.accessToken");
        assertThat(me(bearer)).hasStatusOk();

        MvcTestResult locked = lock(admin, mai.id());

        assertThat(locked).hasStatusOk();
        assertThat(locked).bodyJson().extractingPath("$.id").isEqualTo(mai.id().toString());
        assertThat(locked).bodyJson().extractingPath("$.status").isEqualTo("LOCKED");
        assertThat(locked).bodyJson().extractingPath("$.fullName").isEqualTo(named("Trần Thị Mai"));

        MvcTestResult loginAgain = login(mai);
        assertThat(loginAgain).hasStatus(401);
        assertThat(loginAgain).bodyJson().extractingPath("$.code").isEqualTo("auth.account_locked");
        assertThat(mvc.post().uri("/api/auth/refresh").cookie(cookie)).as("the old refresh token").hasStatus(401);
        // The access token itself is still valid; /api/me is where the web app learns of the lock.
        MvcTestResult me = me(bearer);
        assertThat(me).hasStatus(401);
        assertThat(me).bodyJson().extractingPath("$.code").isEqualTo("auth.account_locked");
    }

    @Test
    void lockingTwiceAndUnlockingTwiceChangeNothingMore() {
        TestAccount mai = create("Trần Thị Mai", "mai", Role.EMPLOYEE);

        assertThat(lock(admin, mai.id())).bodyJson().extractingPath("$.status").isEqualTo("LOCKED");
        MvcTestResult again = lock(admin, mai.id());
        assertThat(again).hasStatusOk();
        assertThat(again).bodyJson().extractingPath("$.status").isEqualTo("LOCKED");

        assertThat(unlock(admin, mai.id())).bodyJson().extractingPath("$.status").isEqualTo("ACTIVE");
        MvcTestResult unlockedAgain = unlock(admin, mai.id());
        assertThat(unlockedAgain).hasStatusOk();
        assertThat(unlockedAgain).bodyJson().extractingPath("$.status").isEqualTo("ACTIVE");
        assertThat(login(mai)).hasStatusOk();
    }

    @Test
    void anUnlockedAccountSignsInAgainButItsOldSessionStaysEnded() {
        TestAccount mai = create("Trần Thị Mai", "mai", Role.HR);
        Cookie oldCookie = login(mai).getResponse().getCookie("refresh_token");
        assertThat(lock(admin, mai.id())).hasStatusOk();

        MvcTestResult unlocked = unlock(admin, mai.id());

        assertThat(unlocked).hasStatusOk();
        assertThat(unlocked).bodyJson().extractingPath("$.status").isEqualTo("ACTIVE");
        assertThat(mvc.post().uri("/api/auth/refresh").cookie(oldCookie)).as("the old refresh token")
                .hasStatus(401);
        MvcTestResult login = login(mai);
        assertThat(login).hasStatusOk();
        assertThat(me("Bearer " + JsonPath.<String>read(body(login), "$.accessToken"))).hasStatusOk();
    }

    @Test
    void theListShowsTheNewStatusAndTheStatusFilterFollows() {
        TestAccount mai = create("Trần Thị Mai", "mai", Role.HR);
        TestAccount hoa = create("Lê Thị Hoa", "hoa", Role.EMPLOYEE);

        lock(admin, mai.id());

        assertThat(ids(list("LOCKED"))).containsExactly(mai.id().toString());
        assertThat(ids(list("ACTIVE"))).containsExactly(hoa.id().toString());
        assertThat(JsonPath.<List<String>>read(body(list(null)), "$.items[*].status"))
                .containsExactly("ACTIVE", "LOCKED");

        unlock(admin, mai.id());

        assertThat(ids(list("LOCKED"))).isEmpty();
        assertThat(ids(list("ACTIVE"))).containsExactly(hoa.id().toString(), mai.id().toString());
    }

    @Test
    void nobodyLocksOrUnlocksTheirOwnAccount() {
        TestAccount second = create("Đỗ Minh Quân", "quan", Role.ADMIN);
        String secondBearer = testAccounts.bearer(mvc, second);

        MvcTestResult lockSelf = lock(secondBearer, second.id());
        assertThat(lockSelf).hasStatus(409);
        assertThat(lockSelf).bodyJson().extractingPath("$.code").isEqualTo("account.cannot_lock_self");
        assertThat(login(second)).as("still active").hasStatusOk();

        // Locked by someone else, the Account cannot undo it with the access token it still holds.
        assertThat(lock(admin, second.id())).hasStatusOk();
        MvcTestResult unlockSelf = unlock(secondBearer, second.id());
        assertThat(unlockSelf).hasStatus(409);
        assertThat(unlockSelf).bodyJson().extractingPath("$.code").isEqualTo("account.cannot_unlock_self");
        assertThat(login(second)).as("still locked").hasStatus(401);
    }

    @Test
    void theLastActiveAdminCannotBeLockedEvenByACallerWhoseTokenStillSaysAdmin() {
        TestAccount first = create("Đỗ Minh Quân", "quan", Role.ADMIN);
        TestAccount second = create("Phạm Quốc Bảo", "bao", Role.ADMIN);
        String firstBearer = testAccounts.bearer(mvc, first);
        String secondBearer = testAccounts.bearer(mvc, second);
        // Other tests leave active Admins behind (the seeded one at least). Inside a transaction that is rolled
        // back, lock them all, so these two are the only active Admins; the requests run in that transaction.
        var transaction = new TransactionTemplate(transactionManager);
        transaction.executeWithoutResult(status -> {
            status.setRollbackOnly();
            jdbc.update("""
                    update account set status = 'LOCKED'
                    where id not in (?, ?) and id in (select account_id from account_role where role = 'ADMIN')""",
                    first.id(), second.id());

            // Two active Admins: one may lock the other.
            MvcTestResult locked = lock(firstBearer, second.id());
            assertThat(locked).hasStatusOk();
            assertThat(locked).bodyJson().extractingPath("$.status").isEqualTo("LOCKED");

            // The locked Admin still holds an access token that says ADMIN. The other one is now the last.
            MvcTestResult refused = lock(secondBearer, first.id());
            assertThat(refused).hasStatus(409);
            assertThat(refused).bodyJson().extractingPath("$.code").isEqualTo("account.last_admin");
            assertThat(jdbc.queryForObject("select status from account where id = ?", String.class, first.id()))
                    .isEqualTo("ACTIVE");
        });

        assertThat(jdbc.queryForList("select status from account where id in (?, ?)", String.class,
                first.id(), second.id())).as("rolled back with the rest").containsExactly("ACTIVE", "ACTIVE");
    }

    @Test
    void onlyAnAccountThatMayEditAccountsLocksAndUnlocks() {
        TestAccount mai = create("Trần Thị Mai", "mai", Role.EMPLOYEE);
        String hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));

        for (MvcTestResult denied : List.of(lock(hr, mai.id()), unlock(hr, mai.id()))) {
            assertThat(denied).hasStatus(403);
            assertThat(denied).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
        }
        assertThat(login(mai)).as("not locked").hasStatusOk();

        assertThat(mvc.post().uri("/api/accounts/{id}/lock", mai.id())).as("signed out").hasStatus(401);
        assertThat(mvc.post().uri("/api/accounts/{id}/unlock", mai.id())).as("signed out").hasStatus(401);
    }

    @Test
    void anAccountThatDoesNotExistIsNotFound() {
        for (MvcTestResult missing : List.of(lock(admin, UUID.randomUUID()), unlock(admin, UUID.randomUUID()))) {
            assertThat(missing).hasStatus(404);
            assertThat(missing).bodyJson().extractingPath("$.code").isEqualTo("account.not_found");
        }
        assertThat(mvc.post().uri("/api/accounts/not-an-id/lock").header(HttpHeaders.AUTHORIZATION, admin))
                .hasStatus(400);
    }

    /** An Account named "{name} {marker}" with the email "{emailPrefix}-{marker}@hrm.test". */
    private TestAccount create(String name, String emailPrefix, Role... roles) {
        return testAccounts.create(named(name), emailPrefix + "-" + marker + "@hrm.test", roles);
    }

    private String named(String name) {
        return name + " " + marker;
    }

    private MvcTestResult lock(String bearer, UUID id) {
        return mvc.post().uri("/api/accounts/{id}/lock", id).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    private MvcTestResult unlock(String bearer, UUID id) {
        return mvc.post().uri("/api/accounts/{id}/unlock", id).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    private MvcTestResult login(TestAccount account) {
        return mvc.post().uri("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"%s"}""".formatted(account.email(), TestAccounts.PASSWORD))
                .exchange();
    }

    private MvcTestResult me(String bearer) {
        return mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    /** This test's Accounts, by full name; {@code status} null for all of them. */
    private MvcTestResult list(String status) {
        var request = mvc.get().uri("/api/accounts").param("q", marker).header(HttpHeaders.AUTHORIZATION, admin);
        return (status == null ? request : request.param("status", status)).exchange();
    }

    private static List<String> ids(MvcTestResult result) {
        return JsonPath.read(body(result), "$.items[*].id");
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
