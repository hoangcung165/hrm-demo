package com.hrmdemo.controller.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.UnsupportedEncodingException;

import com.hrmdemo.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Auth API against real PostgreSQL. The Admin Account comes from the seeder (application-test.yml). */
@IntegrationTest
class AuthApiIT {

    static final String EMAIL = "admin@hrm.test";
    static final String PASSWORD = "test-admin-password";
    static final String REFRESH_COOKIE = "refresh_token";

    @Autowired
    MockMvcTester mvc;

    @Test
    void loginThenMeThenRefreshThenLogout() throws Exception {
        MvcTestResult login = login(EMAIL, PASSWORD);
        assertThat(login).hasStatusOk();
        assertThat(login).bodyJson().extractingPath("$.tokenType").isEqualTo("Bearer");
        assertThat(login).bodyJson().extractingPath("$.expiresIn").isEqualTo(900);
        String setCookie = login.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).contains("HttpOnly", "SameSite=Strict", "Path=/api/auth", "Max-Age=604800");

        MvcTestResult me = mvc.get().uri("/api/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(login))
                .exchange();
        assertThat(me).hasStatusOk();
        assertThat(me).bodyJson().extractingPath("$.email").isEqualTo(EMAIL);
        assertThat(me).bodyJson().extractingPath("$.roles[0]").isEqualTo("ADMIN");

        Cookie firstCookie = refreshCookie(login);
        MvcTestResult refresh = refresh(firstCookie);
        assertThat(refresh).hasStatusOk();
        Cookie secondCookie = refreshCookie(refresh);
        assertThat(secondCookie.getValue()).isNotEqualTo(firstCookie.getValue());
        assertThat(mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(refresh)))
                .hasStatusOk();

        MvcTestResult logout = mvc.post().uri("/api/auth/logout").cookie(secondCookie).exchange();
        assertThat(logout).hasStatus(204);
        assertThat(logout.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("Max-Age=0");
        assertThat(refresh(secondCookie)).hasStatus(401);
    }

    @Test
    void reusingAnOldRefreshTokenRevokesTheWholeFamily() throws Exception {
        Cookie firstCookie = refreshCookie(login(EMAIL, PASSWORD));
        MvcTestResult refresh = refresh(firstCookie);
        assertThat(refresh).hasStatusOk();
        Cookie secondCookie = refreshCookie(refresh);

        MvcTestResult reuse = refresh(firstCookie);
        assertThat(reuse).hasStatus(401);
        assertThat(reuse).bodyJson().extractingPath("$.code").isEqualTo("auth.refresh_token_reused");

        // The revocation is committed even though the request failed: the newest token is dead too.
        assertThat(refresh(secondCookie)).hasStatus(401);
    }

    @Test
    void wrongPasswordReturns401WithCode() {
        MvcTestResult login = login(EMAIL, "not-the-password");

        assertThat(login).hasStatus(401);
        assertThat(login).bodyJson().extractingPath("$.code").isEqualTo("auth.invalid_credentials");
        assertThat(login.getResponse().getHeader(HttpHeaders.SET_COOKIE)).isNull();
    }

    @Test
    void unknownEmailReturnsTheSameError() {
        MvcTestResult login = login("nobody@hrm.test", PASSWORD);

        assertThat(login).hasStatus(401);
        assertThat(login).bodyJson().extractingPath("$.code").isEqualTo("auth.invalid_credentials");
    }

    @Test
    void refreshWithoutCookieReturns401() {
        MvcTestResult refresh = mvc.post().uri("/api/auth/refresh").exchange();

        assertThat(refresh).hasStatus(401);
        assertThat(refresh).bodyJson().extractingPath("$.code").isEqualTo("auth.refresh_token_invalid");
    }

    @Test
    void otherEndpointsRequireAJwt() {
        for (String path : new String[] {"/api/me", "/api/anything-else", "/v3/api-docs", "/actuator/info"}) {
            MvcTestResult result = mvc.get().uri(path).exchange();
            assertThat(result).as(path).hasStatus(401);
            assertThat(result).as(path).bodyJson().extractingPath("$.code").isEqualTo("auth.unauthenticated");
        }
        assertThat(mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer not-a-jwt")).hasStatus(401);
        assertThat(mvc.get().uri("/actuator/health")).hasStatusOk();
    }

    private MvcTestResult login(String email, String password) {
        return mvc.post().uri("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"%s"}""".formatted(email, password))
                .exchange();
    }

    private MvcTestResult refresh(Cookie cookie) {
        return mvc.post().uri("/api/auth/refresh").cookie(cookie).exchange();
    }

    private static String accessToken(MvcTestResult result) throws UnsupportedEncodingException {
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    private static Cookie refreshCookie(MvcTestResult result) {
        Cookie cookie = result.getResponse().getCookie(REFRESH_COOKIE);
        assertThat(cookie).as("refresh cookie").isNotNull();
        return cookie;
    }
}
