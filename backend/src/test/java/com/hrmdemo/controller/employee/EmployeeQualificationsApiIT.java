package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import javax.sql.DataSource;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** Qualification persistence, catalog references, private files, search and data scope. */
@IntegrationTest
class EmployeeQualificationsApiIT {
    @Autowired MockMvcTester mvc;
    @Autowired TestAccounts accounts;
    @Autowired TestEmployees employees;
    @Autowired DataSource dataSource;

    private UUID employeeId;
    private UUID skillId;
    private String admin;
    private String hr;

    @BeforeEach
    void setup() throws Exception {
        employees.deleteAll();
        employeeId = employees.create("Qualification Test Employee", null);
        admin = accounts.adminBearer(mvc);
        hr = accounts.bearer(mvc, accounts.create(Role.HR));
        skillId = UUID.fromString(id(post(admin, "/api/catalogs/skills/items", """
                {"code":"TEST_JAVA","name":"Test Java"} """)));
    }

    @AfterEach
    void cleanup() {
        employees.deleteAll();
        new JdbcTemplate(dataSource).update("delete from catalog_item where id = ?", skillId);
    }

    private String base(String suffix) { return "/api/employees/" + employeeId + "/" + suffix; }

    private MvcTestResult post(String token, String url, String json) {
        return mvc.post().uri(url).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private MvcTestResult put(String token, String url, String json) {
        return mvc.put().uri(url).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(json).exchange();
    }

    private static String id(MvcTestResult response) throws Exception {
        assertThat(response).hasStatus(201);
        return JsonPath.read(response.getResponse().getContentAsString(), "$.id");
    }

    @Test
    void skillsAreUniqueValidatedSearchableAndKeepCatalogItemsInUse() throws Exception {
        String request = "{\"skillId\":\"" + skillId + "\",\"level\":3}";
        assertThat(post(hr, base("skills"), request.replace(":3", ":0"))).hasStatus(400);
        String recordId = id(post(hr, base("skills"), request));
        assertThat(post(hr, base("skills"), request)).hasStatus(409);
        assertThat(mvc.delete().uri("/api/catalogs/skills/items/" + skillId)
                .header("Authorization", admin).exchange())
                .hasStatus(409);

        assertThat(mvc.get().uri("/api/employees?skillId=" + skillId + "&minSkillLevel=3")
                .header("Authorization", hr).exchange()).bodyJson().extractingPath("$.total").isEqualTo(1);
        assertThat(mvc.get().uri("/api/employees?skillId=" + skillId + "&minSkillLevel=4")
                .header("Authorization", hr).exchange()).bodyJson().extractingPath("$.total").isEqualTo(0);
        assertThat(mvc.get().uri("/api/employees?skillId=" + skillId + "&minSkillLevel=6")
                .header("Authorization", hr).exchange()).hasStatus(400);
        assertThat(mvc.get().uri("/api/employees?minSkillLevel=2")
                .header("Authorization", hr).exchange()).hasStatus(400);

        assertThat(put(hr, base("skills/" + recordId), request.replace(":3", ":5"))).hasStatusOk();
        assertThat(mvc.get().uri(base("skills")).header("Authorization", hr).exchange())
                .bodyJson().extractingPath("$[0].level").isEqualTo(5);
        assertThat(mvc.delete().uri(base("skills/" + recordId)).header("Authorization", hr).exchange())
                .hasStatus(204);
        assertThat(mvc.get().uri("/api/employees?skillId=" + skillId)
                .header("Authorization", hr).exchange()).bodyJson().extractingPath("$.total").isEqualTo(0);
    }

    @Test
    void certificatesTrackExpiryAndOnlyLinkFilesFromTheSameEmployee() throws Exception {
        byte[] pdf = "%PDF-1.7\ncertificate\n%%EOF".getBytes(StandardCharsets.UTF_8);
        String ownAttachmentId = id(mvc.post().uri(base("attachments")).header("Authorization", hr).multipart()
                .file(new MockMultipartFile("file", "certificate.pdf", "application/pdf", pdf)).exchange());
        UUID otherEmployee = employees.create("Other Certificate Owner", null);
        String otherAttachmentId = id(mvc.post().uri("/api/employees/" + otherEmployee + "/attachments")
                .header("Authorization", hr).multipart()
                .file(new MockMultipartFile("file", "other.pdf", "application/pdf", pdf)).exchange());

        String value = "{\"name\":\"Cloud certificate\",\"issuer\":\"Exam Board\","
                + "\"issuedAt\":\"2026-01-01\",\"expiresAt\":\"2028-01-01\","
                + "\"attachmentId\":\"" + ownAttachmentId + "\"}";
        assertThat(post(hr, base("certificates"), value.replace("2028-01-01", "2025-01-01")))
                .hasStatus(400);
        assertThat(post(hr, base("certificates"), value.replace(ownAttachmentId, otherAttachmentId)))
                .hasStatus(400);
        String certificateId = id(post(hr, base("certificates"), value));
        assertThat(mvc.get().uri(base("certificates")).header("Authorization", hr).exchange())
                .bodyJson().extractingPath("$[0].expiresAt").isEqualTo("2028-01-01");

        assertThat(mvc.delete().uri(base("attachments/" + ownAttachmentId)).header("Authorization", hr).exchange())
                .hasStatus(204);
        assertThat(mvc.get().uri(base("certificates")).header("Authorization", hr).exchange())
                .bodyJson().extractingPath("$[0].attachmentId").isNull();
        assertThat(put(hr, base("certificates/" + certificateId), value.replace(ownAttachmentId, otherAttachmentId)))
                .hasStatus(400);
        assertThat(mvc.delete().uri(base("certificates/" + certificateId)).header("Authorization", hr).exchange())
                .hasStatus(204);
    }

    @Test
    void profileReadersCanSeeQualificationsButOnlyEditorsCanChangeThem() throws Exception {
        String director = accounts.bearer(mvc, accounts.create(Role.DIRECTOR));
        String request = "{\"skillId\":\"" + skillId + "\",\"level\":2}";
        assertThat(post(hr, base("skills"), request)).hasStatus(201);
        assertThat(mvc.get().uri(base("skills")).header("Authorization", director).exchange()).hasStatusOk();
        assertThat(post(director, base("skills"), request)).hasStatus(403);
        assertThat(post(director, base("certificates"), "{\"name\":\"Test\"}")).hasStatus(403);
        assertThat(mvc.get().uri(base("skills")).exchange()).hasStatus(401);

        TestAccounts.TestAccount employeeAccount = accounts.create(Role.EMPLOYEE);
        employees.link(employeeAccount.id(), employeeId);
        String own = accounts.bearer(mvc, employeeAccount);
        assertThat(mvc.get().uri(base("skills")).header("Authorization", own).exchange()).hasStatusOk();
        assertThat(post(own, base("skills"), request)).hasStatus(403);
        UUID otherEmployee = employees.create("Other Qualification Owner", null);
        assertThat(mvc.get().uri("/api/employees/" + otherEmployee + "/skills")
                .header("Authorization", own).exchange()).hasStatus(403);
    }
}
