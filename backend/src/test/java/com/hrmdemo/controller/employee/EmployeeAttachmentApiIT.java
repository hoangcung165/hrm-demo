package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@IntegrationTest
class EmployeeAttachmentApiIT {
    private static final byte[] PDF = "%PDF-1.7\nexample\n%%EOF".getBytes(StandardCharsets.UTF_8);
    @Autowired MockMvcTester mvc;
    @Autowired TestAccounts accounts;
    @Autowired TestEmployees employees;
    UUID employeeId;
    String hr;

    @BeforeEach
    void setup() {
        employees.deleteAll();
        employeeId = employees.create("Attachment Test Employee", null);
        hr = accounts.bearer(mvc, accounts.create(Role.HR));
    }

    @AfterEach
    void cleanup() {
        employees.deleteAll();
    }

    String base() { return "/api/employees/" + employeeId + "/attachments"; }

    @Test
    void uploadCanBeListedDownloadedAndDeleted() throws Exception {
        MvcTestResult sent = mvc.post().uri(base()).header("Authorization", hr).multipart()
                .file(new MockMultipartFile("file", "test.pdf", "application/pdf", PDF)).exchange();
        assertThat(sent).hasStatus(201);
        String id = JsonPath.read(sent.getResponse().getContentAsString(), "$.id");
        assertThat(mvc.get().uri(base()).header("Authorization", hr).exchange()).hasStatusOk();
        MvcTestResult received = mvc.get().uri(base() + "/" + id).header("Authorization", hr).exchange();
        assertThat(received).hasStatusOk();
        assertThat(received.getResponse().getContentAsByteArray()).isEqualTo(PDF);
        assertThat(received.getResponse().getHeader("Content-Disposition")).contains("attachment");
        assertThat(received.getResponse().getHeader("Cache-Control")).contains("no-store");
        assertThat(mvc.delete().uri(base() + "/" + id).header("Authorization", hr).exchange()).hasStatus(204);
        assertThat(mvc.get().uri(base() + "/" + id).header("Authorization", hr).exchange()).hasStatus(404);
    }

    @Test
    void onlyScopedSensitiveViewersAndTheOwnerCanRead() throws Exception {
        MvcTestResult created = mvc.post().uri(base()).header("Authorization", hr).multipart()
                .file(new MockMultipartFile("file", "secure.pdf", "application/pdf", PDF)).exchange();
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        String director = accounts.bearer(mvc, accounts.create(Role.DIRECTOR));
        assertThat(mvc.get().uri(base()).header("Authorization", director).exchange()).hasStatus(403);
        assertThat(mvc.get().uri(base() + "/" + id).header("Authorization", director).exchange()).hasStatus(403);
        assertThat(mvc.get().uri(base()).exchange()).hasStatus(401);

        TestAccounts.TestAccount employeeAccount = accounts.create(Role.EMPLOYEE);
        employees.link(employeeAccount.id(), employeeId);
        String own = accounts.bearer(mvc, employeeAccount);
        assertThat(mvc.get().uri(base() + "/" + id).header("Authorization", own).exchange()).hasStatusOk();
        assertThat(mvc.delete().uri(base() + "/" + id).header("Authorization", own).exchange()).hasStatus(403);

        UUID otherId = employees.create("Other Attachment Owner", null);
        assertThat(mvc.get().uri("/api/employees/" + otherId + "/attachments/" + id)
                .header("Authorization", hr).exchange()).hasStatus(404);
    }

    @Test
    void rejectsUnsupportedFilesAndUnsafeNames() {
        assertThat(mvc.post().uri(base()).header("Authorization", hr).multipart()
                .file(new MockMultipartFile("file", "fake.pdf", "application/pdf",
                        "plain text".getBytes(StandardCharsets.UTF_8))).exchange()).hasStatus(415);
        assertThat(mvc.post().uri(base()).header("Authorization", hr).multipart()
                .file(new MockMultipartFile("file", "folder/name.pdf", "application/pdf", PDF)).exchange())
                .hasStatus(400);
        assertThat(mvc.post().uri(base()).header("Authorization", hr).multipart()
                .file(new MockMultipartFile("file", "oversized.pdf", "application/pdf",
                        new byte[5 * 1024 * 1024 + 1])).exchange()).hasStatus(413);
    }
}
