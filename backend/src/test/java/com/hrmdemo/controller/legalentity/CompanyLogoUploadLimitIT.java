package com.hrmdemo.controller.legalentity;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import com.hrmdemo.service.legalentity.LegalEntityService;
import com.hrmdemo.service.legalentity.SampleImages;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestcontainersConfiguration;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/**
 * The upload size limit of the servlet container ({@code spring.servlet.multipart.max-file-size}) is not applied
 * by MockMvc, so this test runs the real server: a file above the limit must come back in the API's problem
 * format with the logo's own error code, like the size check in the service.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
class CompanyLogoUploadLimitIT {

    static final String BOUNDARY = "----hrm-test-boundary";

    @Value("${local.server.port}")
    int port;

    final HttpClient http = HttpClient.newHttpClient();

    @Test
    void aFileAboveTheContainerLimitGetsTheLogoTooLargeProblem() throws Exception {
        HttpResponse<String> upload = putLogo(adminBearer(),
                SampleImages.pngOfSize(LegalEntityService.MAX_LOGO_BYTES + 1024));

        assertThat(upload.statusCode()).isEqualTo(413);
        assertThat(upload.headers().firstValue("Content-Type")).hasValueSatisfying(
                type -> assertThat(type).startsWith("application/problem+json"));
        assertThat(JsonPath.<String>read(upload.body(), "$.code")).isEqualTo("company.logo_too_large");
    }

    @Test
    void aFileWithinTheLimitIsStoredThroughTheRealServer() throws Exception {
        HttpResponse<String> upload = putLogo(adminBearer(), SampleImages.PNG);

        assertThat(upload.statusCode()).isEqualTo(200);
        assertThat(JsonPath.<String>read(upload.body(), "$.logoUrl")).startsWith("/api/company/logo?v=");
    }

    private HttpResponse<String> putLogo(String bearer, byte[] content) throws Exception {
        var body = new ByteArrayOutputStream();
        body.write(("--" + BOUNDARY + "\r\n"
                + "Content-Disposition: form-data; name=\"file\"; filename=\"logo.png\"\r\n"
                + "Content-Type: image/png\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
        body.write(content);
        body.write(("\r\n--" + BOUNDARY + "--\r\n").getBytes(StandardCharsets.US_ASCII));
        HttpRequest request = HttpRequest.newBuilder(uri("/api/company/logo"))
                .header("Authorization", bearer)
                .header("Content-Type", "multipart/form-data; boundary=" + BOUNDARY)
                .PUT(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray()))
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private String adminBearer() throws Exception {
        HttpRequest login = HttpRequest.newBuilder(uri("/api/auth/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("""
                        {"email":"%s","password":"%s"}"""
                        .formatted(TestAccounts.ADMIN_EMAIL, TestAccounts.ADMIN_PASSWORD)))
                .build();
        String body = http.send(login, HttpResponse.BodyHandlers.ofString()).body();
        return "Bearer " + JsonPath.<String>read(body, "$.accessToken");
    }

    private URI uri(String path) {
        return URI.create("http://localhost:" + port + path);
    }
}
