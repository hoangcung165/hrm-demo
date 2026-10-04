package com.hrmdemo;

import static org.assertj.core.api.Assertions.assertThat;

import com.hrmdemo.support.IntegrationTest;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** The packaged web app: static files and SPA routes are public, backend paths are never answered with HTML. */
@IntegrationTest
class SpaFallbackIT {

    @Autowired
    MockMvcTester mvc;

    @Test
    void rootAndSpaRoutesReturnIndexHtmlWithoutAJwt() {
        for (String path : new String[] {"/", "/index.html", "/login", "/employees", "/employees/NV-0001/contracts"}) {
            MvcTestResult result = mvc.get().uri(path).exchange();
            assertThat(result).as(path).hasStatusOk();
            assertThat(result).as(path).bodyText().contains("spa-index-marker");
        }
    }

    @Test
    void resetLinkFromTheMailOpensTheSpa() {
        assertThat(mvc.get().uri("/reset-password?token=abc")).hasStatusOk().bodyText().contains("spa-index-marker");
    }

    @Test
    void staticFilesAreServedAndAMissingFileIs404NotHtml() {
        assertThat(mvc.get().uri("/assets/app.js")).hasStatusOk().bodyText().contains("asset-marker");
        assertThat(mvc.get().uri("/assets/missing.js")).hasStatus(404);
        assertThat(mvc.get().uri("/favicon.ico")).hasStatus(404);
    }

    @Test
    void backendPathsStillNeedAJwt() {
        for (String path : new String[] {"/api/me", "/api/anything-else", "/actuator/info", "/v3/api-docs"}) {
            assertThat(mvc.get().uri(path)).as(path).hasStatus(401);
        }
    }

    @Test
    void anUnknownApiPathIs404ForASignedInAccountNotTheSpa() throws Exception {
        MvcTestResult login = mvc.post().uri("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"admin@hrm.test","password":"test-admin-password"}""")
                .exchange();
        String accessToken = JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");

        MvcTestResult result = mvc.get().uri("/api/anything-else")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken).exchange();

        assertThat(result).hasStatus(404);
        assertThat(result.getResponse().getContentAsString()).doesNotContain("spa-index-marker");
    }
}
