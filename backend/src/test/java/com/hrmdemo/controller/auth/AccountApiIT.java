package com.hrmdemo.controller.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * The Account list against real PostgreSQL. Other tests leave Accounts behind in the shared database, so each
 * test here names its Accounts with a marker of its own and searches for that marker.
 */
@IntegrationTest
class AccountApiIT {

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    AccountRepository accounts;
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
        marker = "zq" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    @Test
    void theListIsPagedAndSortedByFullNameWithoutAccentsByDefault() {
        // Created out of order. By code point "Đức" would come last and "Ánh" after "Bình".
        create("Đức", "c", Role.EMPLOYEE);
        create("Bình", "a", Role.EMPLOYEE);
        create("Ánh", "b", Role.EMPLOYEE);
        create("Cường", "d", Role.EMPLOYEE);

        MvcTestResult first = list("q=" + marker + "&size=3");
        assertThat(first).hasStatusOk();
        assertThat(names(first)).containsExactly(named("Ánh"), named("Bình"), named("Cường"));
        assertThat(first).bodyJson().extractingPath("$.total").isEqualTo(4);

        MvcTestResult second = list("q=" + marker + "&size=3&page=1");
        assertThat(names(second)).containsExactly(named("Đức"));
        assertThat(second).bodyJson().extractingPath("$.total").isEqualTo(4);

        MvcTestResult beyond = list("q=" + marker + "&size=3&page=5");
        assertThat(names(beyond)).isEmpty();
        assertThat(beyond).bodyJson().extractingPath("$.total").isEqualTo(4);
    }

    @Test
    void withoutFiltersTheTotalCountsEveryAccountAndThePageHasTwentyRowsAtMost() {
        create("Ánh", "a", Role.EMPLOYEE);

        MvcTestResult all = list("");

        assertThat(all).hasStatusOk();
        assertThat(all).bodyJson().extractingPath("$.total").isEqualTo((int) accounts.count());
        assertThat(names(all)).hasSizeLessThanOrEqualTo(20).isNotEmpty();
    }

    @Test
    void searchFindsPartOfTheFullNameWhateverTheCaseAndAccents() {
        create("Trần Thị Mai", "mai", Role.HR);
        create("Trần Văn Nam", "nam", Role.EMPLOYEE);
        create("Lê Thị Hoa", "hoa", Role.EMPLOYEE);

        assertThat(names(list("q=tran thi mai " + marker))).containsExactly(named("Trần Thị Mai"));
        assertThat(names(list("q=TRẦN THỊ MAI " + marker))).containsExactly(named("Trần Thị Mai"));
        assertThat(names(list("q=  thi   MAI  " + marker))).containsExactly(named("Trần Thị Mai"));
        assertThat(names(list("q=le thi hoa " + marker))).containsExactly(named("Lê Thị Hoa"));
        // "tran thi" alone is what a user types; other tests may own more matches, ours must be among them.
        assertThat(names(list("q=tran thi&size=100")))
                .contains(named("Trần Thị Mai")).doesNotContain(named("Lê Thị Hoa"));
        assertThat(names(list("q=nobody " + marker))).isEmpty();
    }

    @Test
    void searchFindsPartOfTheEmailAndTakesWildcardsLiterally() {
        create("Trần Thị Mai", "mai", Role.HR);
        create("Lê Thị Hoa", "hoa", Role.EMPLOYEE);

        assertThat(names(list("q=MAI-" + marker + "@HRM"))).containsExactly(named("Trần Thị Mai"));
        assertThat(names(list("q=" + marker + "@hrm.test")))
                .containsExactly(named("Lê Thị Hoa"), named("Trần Thị Mai"));
        assertThat(names(list("q=%" + marker))).as("a percent sign is not a wildcard").isEmpty();
        assertThat(names(list("q=ma_-" + marker))).as("an underscore is not a wildcard").isEmpty();
    }

    @Test
    void theRoleAndStatusFiltersNarrowTheListAndCombineWithTheSearch() {
        create("Ánh", "a", Role.HR, Role.EMPLOYEE);
        TestAccount lockedHr = create("Bình", "b", Role.HR);
        create("Cường", "c", Role.EMPLOYEE);
        TestAccount lockedEmployee = create("Đức", "d", Role.EMPLOYEE);
        lock(lockedHr);
        lock(lockedEmployee);

        assertThat(names(list("q=" + marker + "&role=HR"))).containsExactly(named("Ánh"), named("Bình"));
        // An Account with two roles is one row, and the total counts it once.
        assertThat(list("q=" + marker + "&role=EMPLOYEE")).bodyJson().extractingPath("$.total").isEqualTo(3);
        assertThat(names(list("q=" + marker + "&status=LOCKED"))).containsExactly(named("Bình"), named("Đức"));
        assertThat(names(list("q=" + marker + "&status=ACTIVE"))).containsExactly(named("Ánh"), named("Cường"));
        assertThat(names(list("q=" + marker + "&role=HR&status=LOCKED"))).containsExactly(named("Bình"));
        assertThat(names(list("q=binh " + marker + "&role=HR&status=ACTIVE"))).isEmpty();
        assertThat(names(list("q=" + marker + "&role=DIRECTOR"))).isEmpty();

        // Without the search: every row of the page really has the role and the status.
        MvcTestResult lockedHrs = list("role=HR&status=LOCKED&size=100");
        assertThat(names(lockedHrs)).contains(named("Bình")).doesNotContain(named("Ánh"), named("Đức"));
        assertThat(JsonPath.<List<String>>read(body(lockedHrs), "$.items[*].status")).containsOnly("LOCKED");
        assertThat(JsonPath.<List<List<String>>>read(body(lockedHrs), "$.items[*].roles"))
                .allSatisfy(roles -> assertThat(roles).contains("HR"));
    }

    @Test
    void theListSortsByTheAskedColumnInBothDirections() {
        create("Ánh", "c", Role.EMPLOYEE);
        TestAccount binh = create("Bình", "a", Role.EMPLOYEE);
        create("Cường", "b", Role.EMPLOYEE);
        lock(binh);

        assertThat(names(list("q=" + marker + "&sort=fullName,desc")))
                .containsExactly(named("Cường"), named("Bình"), named("Ánh"));
        assertThat(names(list("q=" + marker + "&sort=email")))
                .containsExactly(named("Bình"), named("Cường"), named("Ánh"));
        assertThat(names(list("q=" + marker + "&sort=email,desc")))
                .containsExactly(named("Ánh"), named("Cường"), named("Bình"));
        assertThat(names(list("q=" + marker + "&sort=createdAt")))
                .containsExactly(named("Ánh"), named("Bình"), named("Cường"));
        assertThat(names(list("q=" + marker + "&sort=createdAt,desc")))
                .containsExactly(named("Cường"), named("Bình"), named("Ánh"));
        assertThat(names(list("q=" + marker + "&sort=status,desc")).getFirst()).isEqualTo(named("Bình"));
    }

    @Test
    void aRowCarriesNameRolesWidestDataScopeStatusAndCreationTime() {
        TestAccount manager = create("Lê Văn Hùng", "hung", Role.EMPLOYEE, Role.LINE_MANAGER);

        MvcTestResult list = list("q=" + marker);

        assertThat(list).bodyJson().extractingPath("$.items[0].id").isEqualTo(manager.id().toString());
        assertThat(list).bodyJson().extractingPath("$.items[0].email").isEqualTo(manager.email());
        assertThat(list).bodyJson().extractingPath("$.items[0].fullName").isEqualTo(named("Lê Văn Hùng"));
        assertThat(list).bodyJson().extractingPath("$.items[0].roles").asArray()
                .containsExactlyInAnyOrder("EMPLOYEE", "LINE_MANAGER");
        assertThat(list).bodyJson().extractingPath("$.items[0].dataScope").isEqualTo("ORG_UNIT");
        assertThat(list).bodyJson().extractingPath("$.items[0].status").isEqualTo("ACTIVE");
        assertThat(JsonPath.<String>read(body(list), "$.items[0].createdAt")).startsWith("20").endsWith("Z");
        assertThat(JsonPath.<Object>read(body(list), "$.items[0].employee")).isNull();
        assertThat(JsonPath.<Object>read(body(list), "$.items[0].demoPersona")).isNull();
        assertThat(body(list)).doesNotContain("password").doesNotContain("searchText");
    }

    @Test
    void oneAccountAndMeReturnTheFullName() {
        TestAccount hr = create("Trần Thị Mai", "mai", Role.HR);
        String bearer = testAccounts.bearer(mvc, hr);

        MvcTestResult one = mvc.get().uri("/api/accounts/{id}", hr.id())
                .header(HttpHeaders.AUTHORIZATION, bearer).exchange();
        assertThat(one).hasStatusOk();
        assertThat(one).bodyJson().extractingPath("$.fullName").isEqualTo(named("Trần Thị Mai"));
        assertThat(one).bodyJson().extractingPath("$.dataScope").isEqualTo("COMPANY");
        assertThat(JsonPath.<String>read(body(one), "$.createdAt")).isNotBlank();
        assertThat(JsonPath.<Object>read(body(one), "$.employee")).isNull();

        MvcTestResult me = mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
        assertThat(me).hasStatusOk();
        assertThat(me).bodyJson().extractingPath("$.fullName").isEqualTo(named("Trần Thị Mai"));
        assertThat(me).bodyJson().extractingPath("$.email").isEqualTo(hr.email());
    }

    @Test
    void theSeededAdminHasAFullName() {
        MvcTestResult me = mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, admin).exchange();

        assertThat(me).bodyJson().extractingPath("$.fullName").isEqualTo("Quản trị viên");
        assertThat(names(list("q=quan tri vien&size=100"))).contains("Quản trị viên");
    }

    @Test
    void onlyAnAccountThatMayListAccountsGetsTheList() {
        for (Role role : List.of(Role.HR, Role.DIRECTOR, Role.LINE_MANAGER, Role.EMPLOYEE)) {
            MvcTestResult denied = mvc.get().uri("/api/accounts")
                    .header(HttpHeaders.AUTHORIZATION, testAccounts.bearer(mvc, testAccounts.create(role)))
                    .exchange();

            assertThat(denied).as(role.name()).hasStatus(403);
            assertThat(denied).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
            assertThat(body(denied)).doesNotContain("items");
        }

        MvcTestResult signedOut = mvc.get().uri("/api/accounts").exchange();
        assertThat(signedOut).hasStatus(401);
        assertThat(signedOut).bodyJson().extractingPath("$.code").isEqualTo("auth.unauthenticated");
    }

    @ParameterizedTest
    @ValueSource(strings = {"role=BOSS", "status=GONE", "sort=passwordHash", "sort=fullName,up", "size=101", "size=0",
        "page=-1", "page=first"})
    void anInvalidQueryIsRefusedWithTheValidationCode(String query) {
        MvcTestResult result = list(query);

        assertThat(result).hasStatus(400);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
    }

    @Test
    void anInvalidQueryNamesTheField() {
        assertThat(list("role=BOSS")).bodyJson().extractingPath("$.errors[0].field").isEqualTo("role");
        assertThat(list("size=101")).bodyJson().extractingPath("$.errors[0].field").isEqualTo("size");
    }

    @Test
    void theLargestPageSizeIsAHundred() {
        assertThat(list("size=100")).hasStatusOk();
    }

    @Test
    void anAccountOfAnotherLegalEntityIsNotListed() {
        create("Ánh", "a", Role.EMPLOYEE);
        // A second Legal entity can only exist without the single-row index. DDL is transactional in PostgreSQL,
        // so everything here is rolled back (same approach as LegalEntityIT and OrgUnitApiIT).
        var transaction = new TransactionTemplate(transactionManager);
        transaction.executeWithoutResult(status -> {
            status.setRollbackOnly();
            UUID otherLegalEntity = UUID.randomUUID();
            UUID foreignAccount = UUID.randomUUID();
            jdbc.execute("drop index uq_legal_entity_single");
            jdbc.update("insert into legal_entity (id, name, created_at, updated_at) "
                    + "values (?, 'Another', now(), now())", otherLegalEntity);
            jdbc.update("""
                    insert into account (id, email, full_name, search_text, password_hash, status, created_at,
                                         legal_entity_id)
                    values (?, ?, ?, ?, 'x', 'ACTIVE', now(), ?)""",
                    foreignAccount, "foreign-" + marker + "@hrm.test", "Foreign " + marker, "foreign " + marker,
                    otherLegalEntity);
            jdbc.update("insert into account_role (id, account_id, role) values (?, ?, 'EMPLOYEE')",
                    UUID.randomUUID(), foreignAccount);

            assertThat(jdbc.queryForObject("select count(*) from account where search_text like ?", Long.class,
                    "%" + marker + "%")).as("both rows are really there").isEqualTo(2);

            MvcTestResult list = list("q=" + marker);
            assertThat(names(list)).containsExactly(named("Ánh"));
            assertThat(list).bodyJson().extractingPath("$.total").isEqualTo(1);
            assertThat(names(list("q=" + marker + "&role=EMPLOYEE&status=ACTIVE"))).containsExactly(named("Ánh"));
        });
    }

    /** An Account named "{name} {marker}" with the email "{emailPrefix}-{marker}@hrm.test". */
    private TestAccount create(String name, String emailPrefix, Role... roles) {
        return testAccounts.create(named(name), emailPrefix + "-" + marker + "@hrm.test", roles);
    }

    private String named(String name) {
        return name + " " + marker;
    }

    /** Locking through the API arrives with a later slice. */
    private void lock(TestAccount account) {
        jdbc.update("update account set status = 'LOCKED' where id = ?", account.id());
    }

    /** {@code query} is {@code name=value&name=value}, with the values as the user types them (not encoded). */
    private MvcTestResult list(String query) {
        var request = mvc.get().uri("/api/accounts").header(HttpHeaders.AUTHORIZATION, admin);
        for (String pair : query.isEmpty() ? new String[0] : query.split("&")) {
            int equals = pair.indexOf('=');
            request = request.param(pair.substring(0, equals), pair.substring(equals + 1));
        }
        return request.exchange();
    }

    private static List<String> names(MvcTestResult result) {
        return JsonPath.read(body(result), "$.items[*].fullName");
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
