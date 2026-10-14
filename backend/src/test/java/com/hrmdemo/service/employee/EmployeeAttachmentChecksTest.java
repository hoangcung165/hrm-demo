package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import com.hrmdemo.exception.ApiException;
import org.junit.jupiter.api.Test;

class EmployeeAttachmentChecksTest {
    static final byte[] PDF = "%PDF-1.7\nexample\n%%EOF".getBytes(StandardCharsets.UTF_8);

    @Test
    void validatesContentExtensionAndMimeTogether() {
        var checked = EmployeeAttachmentChecks.validate("Hồ sơ.pdf", "application/pdf", PDF);
        assertThat(checked.fileName()).isEqualTo("Hồ sơ.pdf");
        assertThat(checked.contentType()).isEqualTo("application/pdf");
        assertThrows(ApiException.class, () ->
                EmployeeAttachmentChecks.validate("fake.pdf", "application/pdf", "not-pdf".getBytes()));
        assertThrows(ApiException.class, () ->
                EmployeeAttachmentChecks.validate("test.pdf", "image/png", PDF));
        assertThrows(ApiException.class, () ->
                EmployeeAttachmentChecks.validate("script.html", "text/html", PDF));
    }

    @Test
    void rejectsUnsafeNamesAndOversizedOrEmptyFiles() {
        assertThrows(ApiException.class, () -> EmployeeAttachmentChecks.safeName("../secret.pdf"));
        assertThrows(ApiException.class, () -> EmployeeAttachmentChecks.safeName("x/y.pdf"));
        assertThrows(ApiException.class, () -> EmployeeAttachmentChecks.safeName("x\ny.pdf"));
        assertThrows(ApiException.class, () -> EmployeeAttachmentChecks.safeName("x" + (char) 92 + "y.pdf"));
        assertThrows(ApiException.class, () -> EmployeeAttachmentChecks.validate("a.pdf", "application/pdf", null));
        assertThrows(ApiException.class, () -> EmployeeAttachmentChecks.validate(
                "a.pdf", "application/pdf", new byte[EmployeeAttachmentChecks.MAX_BYTES + 1]));
    }

    @Test
    void officeFilesMustHaveTheirActualDocumentEntry() throws Exception {
        byte[] docx = archive("word/document.xml");
        assertThat(EmployeeAttachmentChecks.validate("cv.docx", "application/octet-stream", docx)
                .contentType()).contains("wordprocessingml");
        assertThrows(ApiException.class, () -> EmployeeAttachmentChecks.validate(
                "renamed.xlsx", "application/octet-stream", docx));
        assertThat(EmployeeAttachmentChecks.validate("report.xlsx", "application/octet-stream",
                archive("xl/workbook.xml")).contentType()).contains("spreadsheetml");
    }

    private static byte[] archive(String path) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry(path));
            zip.write("<root/>".getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        return out.toByteArray();
    }
}
