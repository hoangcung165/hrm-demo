package com.hrmdemo.controller.legalentity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import java.nio.charset.StandardCharsets;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.service.legalentity.LegalEntityService;
import com.hrmdemo.service.legalentity.SampleImages;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Company info API against real PostgreSQL. All tests share the single Legal entity, so each test sets the
 * state it needs and none depends on the order.
 */
@IntegrationTest
class CompanyApiIT {

    static final String FULL_INFO = """
            {"name":"Acme Software JSC","taxCode":"0312345678-001","address":"1 Main Street, District 1",
             "legalRepresentativeName":"Nguyen Van A","legalRepresentativeTitle":"Director"}""";

    @Autowired
    MockMvcTester mvc;
    @Autowired
    TestAccounts testAccounts;

    @Test
    void theAdminUpdatesCompanyInfoAndEverySignedInAccountReadsIt() {
        MvcTestResult update = putInfo(testAccounts.adminBearer(mvc), FULL_INFO);

        assertThat(update).hasStatusOk();
        assertThat(update).bodyJson().extractingPath("$.name").isEqualTo("Acme Software JSC");

        MvcTestResult read = mvc.get().uri("/api/company")
                .header(HttpHeaders.AUTHORIZATION, employeeBearer())
                .exchange();
        assertThat(read).hasStatusOk();
        assertThat(read).bodyJson().extractingPath("$.name").isEqualTo("Acme Software JSC");
        assertThat(read).bodyJson().extractingPath("$.taxCode").isEqualTo("0312345678-001");
        assertThat(read).bodyJson().extractingPath("$.address").isEqualTo("1 Main Street, District 1");
        assertThat(read).bodyJson().extractingPath("$.legalRepresentativeName").isEqualTo("Nguyen Van A");
        assertThat(read).bodyJson().extractingPath("$.legalRepresentativeTitle").isEqualTo("Director");
        assertThat(read).bodyJson().extractingPath("$.updatedAt").isNotNull();
    }

    @Test
    void optionalFieldsCanBeCleared() {
        String admin = testAccounts.adminBearer(mvc);
        assertThat(putInfo(admin, FULL_INFO)).hasStatusOk();

        MvcTestResult update = putInfo(admin, """
                {"name":"  Acme  ","taxCode":"","address":null}""");

        assertThat(update).hasStatusOk();
        assertThat(update).bodyJson().extractingPath("$.name").isEqualTo("Acme");
        assertThat(update).bodyJson().extractingPath("$.taxCode").isNull();
        assertThat(update).bodyJson().extractingPath("$.address").isNull();
        assertThat(update).bodyJson().extractingPath("$.legalRepresentativeName").isNull();
    }

    @Test
    void companyInfoNeedsSignIn() {
        MvcTestResult read = mvc.get().uri("/api/company").exchange();

        assertThat(read).hasStatus(401);
        assertThat(read).bodyJson().extractingPath("$.code").isEqualTo("auth.unauthenticated");
    }

    @Test
    void onlyTheAdminMayChangeCompanyInfoAndLogo() {
        String hr = testAccounts.bearer(mvc, testAccounts.create(Role.HR));

        for (MvcTestResult result : new MvcTestResult[] {
                putInfo(hr, FULL_INFO),
                putLogo(hr, "logo.png", "image/png", SampleImages.PNG),
                mvc.delete().uri("/api/company/logo").header(HttpHeaders.AUTHORIZATION, hr).exchange()}) {
            assertThat(result).hasStatus(403);
            assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("auth.forbidden");
        }
    }

    @Test
    void invalidCompanyInfoIsRejectedWithFieldErrors() {
        MvcTestResult update = putInfo(testAccounts.adminBearer(mvc), """
                {"name":" ","taxCode":"12345","address":"%s"}""".formatted("x".repeat(501)));

        assertThat(update).hasStatus(400);
        assertThat(update).bodyJson().extractingPath("$.code").isEqualTo("validation.invalid");
        assertThat(update).bodyJson().extractingPath("$.errors[*].field").asArray()
                .containsExactlyInAnyOrder("name", "taxCode", "address");
    }

    @Test
    void aTenDigitTaxCodeIsAccepted() {
        MvcTestResult update = putInfo(testAccounts.adminBearer(mvc), """
                {"name":"Acme","taxCode":"0312345678"}""");

        assertThat(update).hasStatusOk();
        assertThat(update).bodyJson().extractingPath("$.taxCode").isEqualTo("0312345678");
    }

    @Test
    void theAdminUploadsALogoAndAnyoneCanFetchItWithoutSigningIn() throws Exception {
        MvcTestResult upload = putLogo(testAccounts.adminBearer(mvc), "logo.png", "image/png", SampleImages.PNG);

        assertThat(upload).hasStatusOk();
        String logoUrl = JsonPath.read(upload.getResponse().getContentAsString(), "$.logoUrl");
        assertThat(logoUrl).matches("/api/company/logo\\?v=\\d+");

        MvcTestResult logo = mvc.get().uri(logoUrl).exchange();
        assertThat(logo).hasStatusOk();
        assertThat(logo.getResponse().getContentAsByteArray()).isEqualTo(SampleImages.PNG);
        assertThat(logo.getResponse().getContentType()).isEqualTo("image/png");
        assertThat(logo.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(logo.getResponse().getHeader(HttpHeaders.CACHE_CONTROL))
                .contains("max-age=31536000", "public", "immutable");
        String etag = logo.getResponse().getHeader(HttpHeaders.ETAG);
        assertThat(etag).isNotBlank();

        // Without the version the browser has to ask again, and gets "not modified" while the logo is the same.
        MvcTestResult unversioned = mvc.get().uri("/api/company/logo").exchange();
        assertThat(unversioned).hasStatusOk();
        assertThat(unversioned.getResponse().getHeader(HttpHeaders.CACHE_CONTROL)).isEqualTo("no-cache");
        assertThat(mvc.get().uri("/api/company/logo").header(HttpHeaders.IF_NONE_MATCH, etag)).hasStatus(304);

        MvcTestResult info = mvc.get().uri("/api/company")
                .header(HttpHeaders.AUTHORIZATION, employeeBearer())
                .exchange();
        assertThat(info).bodyJson().extractingPath("$.logoUrl").isEqualTo(logoUrl);
    }

    @Test
    void theStoredTypeComesFromTheFileContentNotFromWhatTheClientDeclares() {
        MvcTestResult upload = putLogo(testAccounts.adminBearer(mvc), "logo.png", "image/png", SampleImages.WEBP);

        assertThat(upload).hasStatusOk();
        assertThat(mvc.get().uri("/api/company/logo").exchange().getResponse().getContentType())
                .isEqualTo("image/webp");
    }

    @Test
    void aNewUploadChangesTheLogoUrl() throws Exception {
        String admin = testAccounts.adminBearer(mvc);
        String first = JsonPath.read(putLogo(admin, "a.png", "image/png", SampleImages.PNG)
                .getResponse().getContentAsString(), "$.logoUrl");
        Thread.sleep(5);

        String second = JsonPath.read(putLogo(admin, "b.jpg", "image/jpeg", SampleImages.JPEG)
                .getResponse().getContentAsString(), "$.logoUrl");

        assertThat(second).isNotEqualTo(first);
        assertThat(mvc.get().uri(second).exchange().getResponse().getContentAsByteArray())
                .isEqualTo(SampleImages.JPEG);
    }

    @Test
    void anSvgOrAFileThatOnlyClaimsToBeAnImageIsRejected() {
        String admin = testAccounts.adminBearer(mvc);

        for (MvcTestResult result : new MvcTestResult[] {
                putLogo(admin, "logo.svg", "image/svg+xml", SampleImages.SVG),
                putLogo(admin, "logo.png", "image/png", SampleImages.SVG),
                putLogo(admin, "logo.png", "image/png", "GIF89a...".getBytes(StandardCharsets.US_ASCII))}) {
            assertThat(result).hasStatus(415);
            assertThat(result).bodyJson().extractingPath("$.code").isEqualTo("company.logo_unsupported_type");
        }
    }

    @Test
    void aLogoAboveOneMegabyteIsRejected() {
        MvcTestResult upload = putLogo(testAccounts.adminBearer(mvc), "big.png", "image/png",
                SampleImages.pngOfSize(LegalEntityService.MAX_LOGO_BYTES + 1));

        assertThat(upload).hasStatus(413);
        assertThat(upload).bodyJson().extractingPath("$.code").isEqualTo("company.logo_too_large");
    }

    @Test
    void anUploadWithoutAFileIsRejected() {
        MvcTestResult upload = mvc.perform(multipart(HttpMethod.PUT, "/api/company/logo")
                .header(HttpHeaders.AUTHORIZATION, testAccounts.adminBearer(mvc)));

        assertThat(upload).hasStatus(400);
        assertThat(upload).bodyJson().extractingPath("$.code").isEqualTo("company.logo_missing");
    }

    @Test
    void theAdminRemovesTheLogo() {
        String admin = testAccounts.adminBearer(mvc);
        assertThat(putLogo(admin, "logo.png", "image/png", SampleImages.PNG)).hasStatusOk();

        MvcTestResult removed = mvc.delete().uri("/api/company/logo")
                .header(HttpHeaders.AUTHORIZATION, admin)
                .exchange();

        assertThat(removed).hasStatusOk();
        assertThat(removed).bodyJson().extractingPath("$.logoUrl").isNull();
        MvcTestResult logo = mvc.get().uri("/api/company/logo").exchange();
        assertThat(logo).hasStatus(404);
        assertThat(logo).bodyJson().extractingPath("$.code").isEqualTo("company.logo_not_found");
    }

    @Test
    void noEndpointCreatesListsOrDeletesLegalEntities() {
        String admin = testAccounts.adminBearer(mvc);

        assertThat(mvc.post().uri("/api/company").header(HttpHeaders.AUTHORIZATION, admin)
                .contentType(MediaType.APPLICATION_JSON).content(FULL_INFO)).hasStatus(405);
        assertThat(mvc.delete().uri("/api/company").header(HttpHeaders.AUTHORIZATION, admin)).hasStatus(405);
        for (String path : new String[] {"/api/companies", "/api/legal-entities"}) {
            assertThat(mvc.get().uri(path).header(HttpHeaders.AUTHORIZATION, admin)).as(path).hasStatus(404);
        }
    }

    @Test
    void theOpenApiDocumentDescribesTheNewEndpoints() {
        MvcTestResult docs = mvc.get().uri("/v3/api-docs")
                .header(HttpHeaders.AUTHORIZATION, testAccounts.adminBearer(mvc))
                .exchange();

        assertThat(docs).hasStatusOk();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/company'].get").isNotNull();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/company'].put").isNotNull();
        assertThat(docs).bodyJson()
                .extractingPath("$.paths['/api/company/logo'].put.requestBody.content['multipart/form-data']")
                .isNotNull();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/company/logo'].delete").isNotNull();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/company/logo'].get").isNotNull();
        assertThat(docs).bodyJson().extractingPath("$.paths['/api/accounts/{id}'].get").isNotNull();
    }

    private String employeeBearer() {
        return testAccounts.bearer(mvc, testAccounts.create(Role.EMPLOYEE));
    }

    private MvcTestResult putInfo(String bearer, String json) {
        return mvc.put().uri("/api/company")
                .header(HttpHeaders.AUTHORIZATION, bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json)
                .exchange();
    }

    private MvcTestResult putLogo(String bearer, String fileName, String declaredType, byte[] content) {
        return mvc.perform(multipart(HttpMethod.PUT, "/api/company/logo")
                .file(new MockMultipartFile("file", fileName, declaredType, content))
                .header(HttpHeaders.AUTHORIZATION, bearer));
    }
}
