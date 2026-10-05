package com.hrmdemo.controller.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.service.auth.DemoPersonaSeeder;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * "Demo as…" through the API, with {@code hrm.demo-personas.enabled} on (the same Spring context as
 * {@code DemoPersonaSeederIT}). Each test starts with the seven personas as the seeder makes them and removes
 * them afterwards, so tests that run with the flag off never meet them.
 */
@IntegrationTest
@TestPropertySource(properties = "hrm.demo-personas.enabled=true")
class DemoPersonaApiIT {

    @Autowired
    DemoPersonaSeeder seeder;
    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    DataSource dataSource;

    JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        removePersonas();
        seeder.run(null);
    }

    @AfterEach
    void removePersonas() {
        // Roles and tokens go with the Accounts (on delete cascade).
        new JdbcTemplate(dataSource).update("delete from account where demo_persona is not null");
    }

    // --- the list ---

    @Test
    void theListHasTheSevenPersonasInRoleOrderWithNamesTitlesRolesAndAvailability() {
        MvcTestResult list = personas(testAccounts.adminBearer(mvc));

        assertThat(list).hasStatusOk();
        assertThat(strings(list, "$.personas[*].persona")).containsExactly("ADMIN", "HR", "LINE_MANAGER",
                "PROJECT_MANAGER", "ACCOUNTANT", "DIRECTOR", "EMPLOYEE");
        assertThat(strings(list, "$.personas[*].fullName")).containsExactly("Đỗ Minh Quân", "Trần Thị Mai",
                "Lê Văn Hùng", "Vũ Thị Lan", "Hoàng Thị Thu", "Phạm Quốc Bảo", "Nguyễn Văn An");
        assertThat(strings(list, "$.personas[*].title")).containsExactly("Quản trị hệ thống",
                "Trưởng phòng nhân sự", "Trưởng nhóm Web", "Quản lý dự án", "Kế toán trưởng", "Giám đốc",
                "Lập trình viên");
        assertThat(strings(list, "$.personas[0].roles[*]")).containsExactly("ADMIN");
        assertThat(strings(list, "$.personas[1].roles[*]")).containsExactly("HR", "EMPLOYEE");
        assertThat(strings(list, "$.personas[2].roles[*]")).containsExactly("LINE_MANAGER", "EMPLOYEE");
        assertThat(strings(list, "$.personas[6].roles[*]")).containsExactly("EMPLOYEE");
        assertThat(JsonPath.<List<Boolean>>read(body(list), "$.personas[*].available"))
                .hasSize(7).containsOnly(true);
        assertThat(body(list)).doesNotContain("@hrm.local").doesNotContain("password");
    }

    @Test
    void aLockedOrMissingPersonaIsListedAsUnavailableAndCannotBeSignedInAs() {
        MvcTestResult login = login(TestAccounts.ADMIN_EMAIL, TestAccounts.ADMIN_PASSWORD);
        String admin = bearer(login);
        Cookie cookie = refreshCookie(login);
        UUID hr = jdbc.queryForObject("select id from account where demo_persona = 'HR'", UUID.class);
        assertThat(mvc.post().uri("/api/accounts/{id}/lock", hr).header(HttpHeaders.AUTHORIZATION, admin))
                .hasStatusOk();
        jdbc.update("delete from account where demo_persona = 'DIRECTOR'");

        MvcTestResult list = personas(admin);
        assertThat(strings(list, "$.personas[?(@.available == false)].persona")).containsExactly("HR", "DIRECTOR");
        assertThat(strings(list, "$.personas[?(@.available == true)].persona"))
                .containsExactly("ADMIN", "LINE_MANAGER", "PROJECT_MANAGER", "ACCOUNTANT", "EMPLOYEE");

        for (String persona : List.of("HR", "DIRECTOR")) {
            MvcTestResult refused = signIn(admin, cookie, persona);
            assertThat(refused).as(persona).hasStatus(409);
            assertThat(refused).bodyJson().extractingPath("$.code").isEqualTo("demo.persona_unavailable");
            assertThat(refused.getResponse().getHeader(HttpHeaders.SET_COOKIE)).isNull();
        }
        // A refused switch ends nothing: the caller's session is still there.
        assertThat(refresh(cookie)).hasStatusOk();
    }

    // --- the switch ---

    @Test
    void switchingGivesThePersonasSessionAndEndsTheSessionItCameFrom() {
        MvcTestResult login = login(TestAccounts.ADMIN_EMAIL, TestAccounts.ADMIN_PASSWORD);
        Cookie adminCookie = refreshCookie(login);

        MvcTestResult switched = signIn(bearer(login), adminCookie, "HR");

        // The same response as a login.
        assertThat(switched).hasStatusOk();
        assertThat(switched).bodyJson().extractingPath("$.tokenType").isEqualTo("Bearer");
        assertThat(switched).bodyJson().extractingPath("$.expiresIn").isEqualTo(900);
        assertThat(switched.getResponse().getHeader(HttpHeaders.SET_COOKIE))
                .contains("refresh_token=", "HttpOnly", "SameSite=Strict", "Path=/api/auth", "Max-Age=604800");
        Cookie hrCookie = refreshCookie(switched);
        assertThat(hrCookie.getValue()).isNotBlank().isNotEqualTo(adminCookie.getValue());

        // The new access token is the persona's.
        MvcTestResult me = me(bearer(switched));
        assertThat(me).hasStatusOk();
        assertThat(me).bodyJson().extractingPath("$.email").isEqualTo("demo.hr@hrm.local");
        assertThat(me).bodyJson().extractingPath("$.fullName").isEqualTo("Trần Thị Mai");
        assertThat(me).bodyJson().extractingPath("$.roles").asArray().containsExactlyInAnyOrder("HR", "EMPLOYEE");
        assertThat(me).bodyJson().extractingPath("$.dataScope").isEqualTo("COMPANY");
        assertThat(me).bodyJson().extractingPath("$.permissions").asArray()
                .contains("ORG_EDIT").doesNotContain("ACCOUNT_EDIT");
        assertThat(me).bodyJson().extractingPath("$.demo.enabled").isEqualTo(true);
        assertThat(me).bodyJson().extractingPath("$.demo.persona").isEqualTo("HR");

        // The previous refresh token is refused, the new one works and still belongs to the persona.
        assertThat(refresh(adminCookie)).as("the session the switch came from").hasStatus(401);
        MvcTestResult refreshed = refresh(hrCookie);
        assertThat(refreshed).as("the persona's session").hasStatusOk();
        assertThat(me(bearer(refreshed))).bodyJson().extractingPath("$.demo.persona").isEqualTo("HR");
    }

    @Test
    void aPersonaSwitchesToAnotherPersonaAndBackToTheAdminPersona() {
        MvcTestResult asHr = signIn(testAccounts.adminBearer(mvc), null, "HR");
        assertThat(asHr).hasStatusOk();

        MvcTestResult asEmployee = signIn(bearer(asHr), refreshCookie(asHr), "EMPLOYEE");
        assertThat(asEmployee).hasStatusOk();
        MvcTestResult employee = me(bearer(asEmployee));
        assertThat(employee).bodyJson().extractingPath("$.demo.persona").isEqualTo("EMPLOYEE");
        assertThat(employee).bodyJson().extractingPath("$.roles").asArray().containsExactly("EMPLOYEE");
        assertThat(employee).bodyJson().extractingPath("$.dataScope").isEqualTo("SELF");
        assertThat(refresh(refreshCookie(asHr))).as("the HR persona's session").hasStatus(401);

        MvcTestResult asAdmin = signIn(bearer(asEmployee), refreshCookie(asEmployee), "ADMIN");
        assertThat(asAdmin).hasStatusOk();
        MvcTestResult adminPersona = me(bearer(asAdmin));
        assertThat(adminPersona).bodyJson().extractingPath("$.demo.persona").isEqualTo("ADMIN");
        assertThat(adminPersona).bodyJson().extractingPath("$.email").isEqualTo("demo.admin@hrm.local");
        assertThat(adminPersona).bodyJson().extractingPath("$.permissions").asArray().contains("ACCOUNT_EDIT");
        assertThat(refresh(refreshCookie(asEmployee))).as("the Employee persona's session").hasStatus(401);
        assertThat(refresh(refreshCookie(asAdmin))).as("the Admin persona's session").hasStatusOk();
    }

    @Test
    void anyActiveSignedInAccountMaySwitchWhateverItsRoles() {
        TestAccount employee = testAccounts.create(Role.EMPLOYEE);

        MvcTestResult switched = signIn(testAccounts.bearer(mvc, employee), null, "DIRECTOR");

        assertThat(switched).hasStatusOk();
        assertThat(me(bearer(switched))).bodyJson().extractingPath("$.demo.persona").isEqualTo("DIRECTOR");
    }

    @Test
    void withoutARefreshCookieTheSwitchWorksAndEndsNoSession() {
        MvcTestResult login = login(TestAccounts.ADMIN_EMAIL, TestAccounts.ADMIN_PASSWORD);

        MvcTestResult switched = signIn(bearer(login), null, "ACCOUNTANT");

        assertThat(switched).hasStatusOk();
        assertThat(me(bearer(switched))).bodyJson().extractingPath("$.demo.persona").isEqualTo("ACCOUNTANT");
        assertThat(refresh(refreshCookie(login))).as("the cookie was not sent, so that session lives on")
                .hasStatusOk();
    }

    @Test
    void aRefreshCookieThatWasAlreadyExchangedStillEndsItsWholeSession() {
        MvcTestResult login = login(TestAccounts.ADMIN_EMAIL, TestAccounts.ADMIN_PASSWORD);
        Cookie first = refreshCookie(login);
        MvcTestResult refreshed = refresh(first);
        assertThat(refreshed).hasStatusOk();
        Cookie second = refreshCookie(refreshed);

        // The browser sends the older cookie, e.g. because the newer one never reached it.
        assertThat(signIn(bearer(refreshed), first, "HR")).hasStatusOk();

        assertThat(refresh(second)).as("the newest token of that session").hasStatus(401);
    }

    @Test
    void aRefreshCookieThatIsNotRecognisedIsIgnored() {
        MvcTestResult switched = signIn(testAccounts.adminBearer(mvc), new Cookie("refresh_token", "not-a-token"),
                "HR");

        assertThat(switched).hasStatusOk();
        assertThat(refresh(refreshCookie(switched))).hasStatusOk();
    }

    // --- refusals ---

    @ParameterizedTest
    @ValueSource(strings = {"{\"persona\":\"BOSS\"}", "{\"persona\":\"hr\"}", "{\"persona\":\"\"}", "{}",
        "{\"persona\":\"admin@hrm.test\"}"})
    void aKeyThatIsNotAPersonaIsInvalid(String json) {
        MvcTestResult result = mvc.post().uri("/api/auth/demo/sign-in")
                .header(HttpHeaders.AUTHORIZATION, testAccounts.adminBearer(mvc))
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();

        assertThat(result).hasStatus(400);
        assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(result).bodyJson().extractingPath("$.errors[0].field").isEqualTo("persona");
        assertThat(result.getResponse().getHeader(HttpHeaders.SET_COOKIE)).isNull();
    }

    @Test
    void aSignedOutCallerGetsNeitherTheListNorASessionEvenWithARefreshCookie() {
        Cookie cookie = refreshCookie(login(TestAccounts.ADMIN_EMAIL, TestAccounts.ADMIN_PASSWORD));

        MvcTestResult list = mvc.get().uri("/api/auth/demo/personas").cookie(cookie).exchange();
        assertThat(list).hasStatus(401);
        assertThat(list).bodyJson().extractingPath("$.code").isEqualTo("auth.unauthenticated");

        MvcTestResult switched = mvc.post().uri("/api/auth/demo/sign-in").cookie(cookie)
                .contentType(MediaType.APPLICATION_JSON).content("{\"persona\":\"ADMIN\"}").exchange();
        assertThat(switched).hasStatus(401);
        assertThat(switched).bodyJson().extractingPath("$.code").isEqualTo("auth.unauthenticated");
        assertThat(switched.getResponse().getHeader(HttpHeaders.SET_COOKIE)).isNull();
        assertThat(body(switched)).doesNotContain("accessToken");
    }

    @Test
    void aCallerLockedAfterSigningInCannotSwitchOrSeeTheList() {
        TestAccount someone = testAccounts.create(Role.HR);
        String bearer = testAccounts.bearer(mvc, someone);
        assertThat(mvc.post().uri("/api/accounts/{id}/lock", someone.id())
                .header(HttpHeaders.AUTHORIZATION, testAccounts.adminBearer(mvc))).hasStatusOk();

        // The access token is still valid for a few minutes; the Account is read again.
        MvcTestResult switched = signIn(bearer, null, "ADMIN");
        assertThat(switched).hasStatus(401);
        assertThat(switched).bodyJson().extractingPath("$.code").isEqualTo("auth.account_locked");
        assertThat(switched.getResponse().getHeader(HttpHeaders.SET_COOKIE)).isNull();

        MvcTestResult list = personas(bearer);
        assertThat(list).hasStatus(401);
        assertThat(list).bodyJson().extractingPath("$.code").isEqualTo("auth.account_locked");
    }

    @Test
    void anOrdinaryAccountSeesTheSwitchInMeButIsNoPersona() {
        MvcTestResult me = me(testAccounts.adminBearer(mvc));

        assertThat(me).bodyJson().extractingPath("$.demo.enabled").isEqualTo(true);
        assertThat(JsonPath.<Object>read(body(me), "$.demo.persona")).isNull();
    }

    // --- helpers ---

    private MvcTestResult personas(String bearer) {
        return mvc.get().uri("/api/auth/demo/personas").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    /** {@code cookie} null: the request carries no refresh cookie. */
    private MvcTestResult signIn(String bearer, Cookie cookie, String persona) {
        var request = mvc.post().uri("/api/auth/demo/sign-in").header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"persona":"%s"}""".formatted(persona));
        return (cookie == null ? request : request.cookie(cookie)).exchange();
    }

    private MvcTestResult login(String email, String password) {
        return mvc.post().uri("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"%s"}""".formatted(email, password))
                .exchange();
    }

    private MvcTestResult refresh(Cookie cookie) {
        return mvc.post().uri("/api/auth/refresh").cookie(cookie).exchange();
    }

    private MvcTestResult me(String bearer) {
        return mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, bearer).exchange();
    }

    /** The Authorization header value for the access token in a login or switch response. */
    private static String bearer(MvcTestResult session) {
        return "Bearer " + JsonPath.<String>read(body(session), "$.accessToken");
    }

    private static Cookie refreshCookie(MvcTestResult session) {
        Cookie cookie = session.getResponse().getCookie("refresh_token");
        assertThat(cookie).as("refresh cookie").isNotNull();
        return cookie;
    }

    private static List<String> strings(MvcTestResult result, String path) {
        return JsonPath.read(body(result), path);
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
