package com.hrmdemo.controller.employee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import com.hrmdemo.support.IntegrationTest;
import com.hrmdemo.support.TestAccounts;
import com.hrmdemo.support.TestEmployees;
import com.jayway.jsonpath.JsonPath;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.UUID;
import javax.sql.DataSource;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** The exported Word file carries the contract's data in Vietnamese, from a template replaced without code. */
@IntegrationTest
class ContractExportApiIT {
    private static final String TYPE = "FIXED_TERM";

    @Autowired MockMvcTester mvc;
    @Autowired TestEmployees employees;
    @Autowired TestAccounts accounts;
    @Autowired DataSource dataSource;

    JdbcTemplate jdbc;
    UUID employeeId;
    String admin;

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        jdbc.update("delete from contract_template where contract_type = ?", TYPE);
        employees.deleteAll();
        employeeId = employees.create("Nguyễn Văn Ánh", null);
        admin = accounts.adminBearer(mvc);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("delete from contract_template where contract_type = ?", TYPE);
        jdbc.update("delete from employee_salary_profile where employee_id = ?", employeeId);
        jdbc.update("delete from employment_contract where employee_id = ?", employeeId);
        employees.deleteAll();
    }

    byte[] template(String text) throws Exception {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.createParagraph().createRun().setText(text);
            doc.write(out);
            return out.toByteArray();
        }
    }

    void upload(String text) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "mau.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", template(text));
        assertThat(mvc.perform(multipart("/api/contract-templates/" + TYPE).file(file)
                .header(HttpHeaders.AUTHORIZATION, admin))).hasStatus(201);
    }

    String createContract() throws Exception {
        MvcTestResult created = mvc.post().uri("/api/employees/" + employeeId + "/contracts")
                .header("Authorization", admin).contentType(MediaType.APPLICATION_JSON).content("""
                        {"contractNumber":"HD-IT-EXPORT-%s","contractType":"FIXED_TERM",
                         "signedOn":"2026-01-02","startsOn":"2026-01-05","endsOn":null,
                         "baseSalary":18000000,"insuranceSalary":15500000,
                         "allowancesJson":"[]","insured":true,"taxMethod":"PROGRESSIVE"}
                        """.formatted(employeeId)).exchange();
        assertThat(created).hasStatus(201);
        return JsonPath.read(created.getResponse().getContentAsString(), "$.id");
    }

    String exportedText(String contractId) throws Exception {
        MvcTestResult exported = mvc.get().uri("/api/employees/" + employeeId + "/contracts/" + contractId
                + "/export?format=docx").header("Authorization", admin).exchange();
        assertThat(exported).hasStatusOk();
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(exported.getResponse().getContentAsByteArray()))) {
            return doc.getParagraphs().get(0).getText();
        }
    }

    @Test
    void theExportedWordFileHoldsTheContractDataInVietnamese() throws Exception {
        upload("{{employee_name}} | {{contract_number}} | {{contract_type}} | {{signed_on}} | {{starts_on}} | "
                + "{{ends_on}} | {{base_salary}} | {{insurance_salary}} | {{insured}} | {{tax_method}}");

        assertThat(exportedText(createContract())).isEqualTo("Nguyễn Văn Ánh | HD-IT-EXPORT-" + employeeId
                + " | Hợp đồng xác định thời hạn | 02/01/2026 | 05/01/2026 |  | 18.000.000 | 15.500.000 | Có | Lũy tiến");
    }

    @Test
    void aNewTemplateVersionChangesTheExportWithoutCodeChanges() throws Exception {
        String contractId = createContract();
        upload("Phiên bản 1: {{contract_number}}");
        assertThat(exportedText(contractId)).isEqualTo("Phiên bản 1: HD-IT-EXPORT-" + employeeId);

        upload("Phiên bản 2: {{base_salary}} đồng");
        assertThat(exportedText(contractId)).isEqualTo("Phiên bản 2: 18.000.000 đồng");
        assertThat(jdbc.queryForObject("select count(*) from contract_template where contract_type = ? and active",
                Integer.class, TYPE)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from contract_template where contract_type = ?",
                Integer.class, TYPE)).isEqualTo(2);
    }
}
