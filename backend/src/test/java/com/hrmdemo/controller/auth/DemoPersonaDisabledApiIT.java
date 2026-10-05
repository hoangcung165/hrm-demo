package com.hrmdemo.controller.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.DemoPersona;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.service.auth.DemoPersonaService;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * "Demo as…" with {@code hrm.demo-personas.enabled} off (the default and the test profile): the endpoints
 * are not there and answer like any path that does not exist.
 */
@IntegrationTest
class DemoPersonaDisabledApiIT {

    static final String SIGN_IN_BODY = "{\"persona\":\"ADMIN\"}";

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;
    @Autowired
    ApplicationContext context;
    @Autowired
    AccountRepository accounts;
    @Autowired
    PasswordEncoder passwordEncoder;
    @Autowired
    DataSource dataSource;

    @AfterEach
    void removePersonas() {
        new JdbcTemplate(dataSource).update("delete from account where demo_persona is not null");
    }

    @Test
    void theControllerAndTheServiceDoNotExist() {
        assertThat(context.getBeanNamesForType(DemoPersonaController.class)).isEmpty();
        assertThat(context.getBeanNamesForType(DemoPersonaService.class)).isEmpty();
    }

    @Test
    void aSignedOutCallerGets401OnBothPathsAsWithTheFlagOn() {
        MvcTestResult list = mvc.get().uri("/api/auth/demo/personas").exchange();
        assertThat(list).hasStatus(401);
        assertThat(list).bodyJson().extractingPath("$.code").isEqualTo("auth.unauthenticated");

        MvcTestResult signIn = mvc.post().uri("/api/auth/demo/sign-in")
                .contentType(MediaType.APPLICATION_JSON).content(SIGN_IN_BODY).exchange();
        assertThat(signIn).hasStatus(401);
        assertThat(signIn).bodyJson().extractingPath("$.code").isEqualTo("auth.unauthenticated");
    }

    @Test
    void forASignedInCallerTheListAnswersLikeAnyUnknownPath() {
        String admin = testAccounts.adminBearer(mvc);

        MvcTestResult list = mvc.get().uri("/api/auth/demo/personas")
                .header(HttpHeaders.AUTHORIZATION, admin).exchange();
        MvcTestResult unknown = mvc.get().uri("/api/anything-else")
                .header(HttpHeaders.AUTHORIZATION, admin).exchange();

        assertThat(list).hasStatus(404);
        assertThat(unknown).hasStatus(404);
        // Not the API's own "not found" either: no error code that would name the feature.
        assertThat(body(list)).doesNotContain("\"code\"").doesNotContain("fullName");
    }

    @Test
    void forASignedInCallerTheSwitchAnswersLikeAnyUnknownPathAndStartsNoSession() {
        String admin = testAccounts.adminBearer(mvc);

        MvcTestResult signIn = mvc.post().uri("/api/auth/demo/sign-in").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content(SIGN_IN_BODY).exchange();
        MvcTestResult unknown = mvc.post().uri("/api/anything-else").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content(SIGN_IN_BODY).exchange();

        // A POST to a path nobody handles: whatever the framework answers there, the demo path answers the same.
        assertThat(signIn.getResponse().getStatus()).isEqualTo(unknown.getResponse().getStatus()).isIn(404, 405);
        assertThat(signIn.getResponse().getHeader(HttpHeaders.SET_COOKIE)).isNull();
        assertThat(body(signIn)).doesNotContain("accessToken");
    }

    @Test
    void meSaysTheSwitchIsNotThere() {
        MvcTestResult me = mvc.get().uri("/api/me")
                .header(HttpHeaders.AUTHORIZATION, testAccounts.adminBearer(mvc)).exchange();

        assertThat(me).hasStatusOk();
        assertThat(me).bodyJson().extractingPath("$.demo.enabled").isEqualTo(false);
        assertThat(JsonPath.<Object>read(body(me), "$.demo.persona")).isNull();
    }

    @Test
    void aPersonaAccountLeftInTheDatabaseShowsNoPersonaInMe() {
        // Left by an earlier run with the flag on; given a known password here only to get a session for it.
        accounts.save(Account.forDemoPersona(DemoPersona.HR, passwordEncoder.encode("left-over-2026"),
                Instant.now()));
        MvcTestResult login = mvc.post().uri("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"demo.hr@hrm.local\",\"password\":\"left-over-2026\"}").exchange();
        assertThat(login).hasStatusOk();

        MvcTestResult me = mvc.get().uri("/api/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + JsonPath.<String>read(body(login), "$.accessToken"))
                .exchange();

        assertThat(me).hasStatusOk();
        assertThat(me).bodyJson().extractingPath("$.email").isEqualTo("demo.hr@hrm.local");
        assertThat(me).bodyJson().extractingPath("$.demo.enabled").isEqualTo(false);
        assertThat(JsonPath.<Object>read(body(me), "$.demo.persona")).isNull();
    }

    private static String body(MvcTestResult result) {
        return new String(result.getResponse().getContentAsByteArray(), StandardCharsets.UTF_8);
    }
}
