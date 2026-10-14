package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestAccounts.TestAccount;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Insurance, expat documents and nationality filtering on the real database. */
@IntegrationTest
class EmployeeComplianceApiIT {
    @Autowired MockMvcTester mvc;
    @Autowired TestAccounts accounts;
    @Autowired TestEmployees employees;

    UUID employeeId;
    String hr;
    String director;
    String self;

    @BeforeEach
    void setUp() {
        employees.deleteAll();
        employeeId = employees.create("Employee for Insurance", null);
        hr = accounts.bearer(mvc, accounts.create(Role.HR));
        director = accounts.bearer(mvc, accounts.create(Role.DIRECTOR));
        TestAccount employeeAccount = accounts.create(Role.EMPLOYEE);
        employees.link(employeeAccount.id(), employeeId);
        self = accounts.bearer(mvc, employeeAccount);
    }

    @AfterEach
    void cleanUp() {
        employees.deleteAll();
    }

    String path(String child) { return "/api/employees/" + employeeId + "/" + child; }

    MvcTestResult get(String bearer, String path) {
        return mvc.get().uri(path).header("Authorization", bearer).exchange();
    }

    MvcTestResult put(String bearer, String path, String json) {
        return mvc.put().uri(path).header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                .content(json).exchange();
    }

    MvcTestResult post(String bearer, String path, String json) {
        return mvc.post().uri(path).header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                .content(json).exchange();
    }

    String body(MvcTestResult response) {
        try {
            return response.getResponse().getContentAsString();
        } catch (java.io.UnsupportedEncodingException ex) {
            throw new IllegalStateException(ex);
        }
    }

    @Test
    void insuranceUpsertAndExistingSocialInsuranceIdentityAreSeparate() {
        assertThat(get(hr, path("insurance"))).hasStatusOk();
        MvcTestResult saved = put(hr, path("insurance"), """
                {"participationDate":"2021-01-12",
                 "healthRegistrationPlace":"District hospital",
                 "healthInsuranceNumber":"DN4012345678"}""");
        assertThat(saved).hasStatusOk();
        assertThat(saved).bodyJson().extractingPath("$.participationDate").isEqualTo("2021-01-12");
        assertThat(saved).bodyJson().extractingPath("$.healthInsuranceNumber").isEqualTo("DN4012345678");
        assertThat(get(director, path("insurance"))).bodyJson()
                .extractingPath("$.healthInsuranceNumber").isEqualTo("••••••••5678");
        assertThat(get(self, path("insurance"))).bodyJson()
                .extractingPath("$.healthInsuranceNumber").isEqualTo("DN4012345678");
        assertThat(put(director, path("insurance"), "{}")).hasStatus(403);
        assertThat(put(self, path("insurance"), "{}")).hasStatus(403);
        assertThat(put(hr, path("insurance"), """
                {"participationDate":"2022-02-02","healthRegistrationPlace":"New hospital"}""")).hasStatusOk();
        assertThat(get(hr, path("insurance"))).bodyJson()
                .extractingPath("$.healthInsuranceNumber").isEqualTo(null);
    }

    @Test
    void nationalityCanBeChangedAndFilteredWithoutEscapingEmployeeScope() {
        UUID another = employees.create("Second Employee", null);
        assertThat(put(hr, path("nationality"), "{\"nationality\":\" au \"}")).hasStatusOk();
        assertThat(get(hr, path("nationality"))).bodyJson().extractingPath("$.nationality").isEqualTo("AU");
        assertThat(get(hr, "/api/employees?nationality=au")).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(get(hr, "/api/employees?nationality=VN")).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(get(hr, "/api/employees?nationality=invalid")).hasStatus(400);
        assertThat(put(director, path("nationality"), "{\"nationality\":\"VN\"}")).hasStatus(403);
        assertThat(get(self, path("nationality"))).hasStatusOk();
        assertThat(put(hr, path("nationality"), "{\"nationality\":null}")).hasStatusOk();
        assertThat(get(hr, "/api/employees?nationality=AU")).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(another).isNotEqualTo(employeeId);
    }

    @Test
    void expatDocumentsValidateExpiryAndMaskNumbersForOrdinaryViewer() {
        String request = """
                {"documentType":"WORK_PERMIT","documentNumber":"WP1234567",
                 "issuingCountry":"vn","issuedAt":"2025-01-01","expiresAt":"2027-01-01"}""";
        MvcTestResult created = post(hr, path("expat-documents"), request);
        assertThat(created).hasStatus(201);
        String id = JsonPath.read(body(created), "$.id");
        assertThat(created).bodyJson().extractingPath("$.issuingCountry").isEqualTo("VN");
        assertThat(get(director, path("expat-documents"))).bodyJson()
                .extractingPath("$[0].documentNumber").isEqualTo("•••••4567");
        assertThat(get(self, path("expat-documents"))).bodyJson()
                .extractingPath("$[0].documentNumber").isEqualTo("WP1234567");
        assertThat(put(hr, path("expat-documents/" + id),
                request.replace("2027-01-01", "2024-01-01"))).hasStatus(400);
        assertThat(post(hr, path("expat-documents"),
                request.replace("WORK_PERMIT", "OTHER"))).hasStatus(400);
        assertThat(post(director, path("expat-documents"), request)).hasStatus(403);
        assertThat(mvc.delete().uri(path("expat-documents/" + id))
                .header("Authorization", hr).exchange()).hasStatus(204);
        assertThat(get(hr, path("expat-documents"))).bodyJson().extractingPath("$.length()").isEqualTo(0);
    }

    @Test
    void missingEmployeeAndUnauthenticatedRequestsDoNotExposeInsurance() {
        assertThat(mvc.get().uri(path("insurance")).exchange()).hasStatus(401);
        assertThat(get(hr, "/api/employees/" + UUID.randomUUID() + "/insurance")).hasStatus(404);
    }
}
