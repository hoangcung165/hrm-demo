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
 * The upload size limit of the servlet container ({@code spring.servlet.multipart.max-file-size}, 5 MB) is not
 * applied by MockMvc, so this test runs the real server. A file above an endpoint's own limit must come back in the
 * API's problem format with that endpoint's error code: the logo's 1 MB (checked by its controller, below the
 * container's limit) and the employee import's 5 MB (refused by the container itself).
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
    void aLogoAboveItsLimitGetsTheLogoTooLargeProblem() throws Exception {
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

    @Test
    void anImportFileAboveTheContainerLimitGetsTheImportsOwnProblem() throws Exception {
        var body = new ByteArrayOutputStream();
        body.write(("--" + BOUNDARY + "\r\n"
                + "Content-Disposition: form-data; name=\"file\"; filename=\"nhan-vien.xlsx\"\r\n"
                + "Content-Type: application/octet-stream\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
        body.write(new byte[5 * 1024 * 1024 + 1024]);
        body.write(("\r\n--" + BOUNDARY + "--\r\n").getBytes(StandardCharsets.US_ASCII));
        HttpRequest request = HttpRequest.newBuilder(uri("/api/employees/import/validate"))
                .header("Authorization", adminBearer())
                .header("Content-Type", "multipart/form-data; boundary=" + BOUNDARY)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray()))
                .build();

        HttpResponse<String> upload = http.send(request, HttpResponse.BodyHandlers.ofString());

        assertThat(upload.statusCode()).isEqualTo(413);
        assertThat(JsonPath.<String>read(upload.body(), "$.code")).isEqualTo("import.file_too_large");
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
