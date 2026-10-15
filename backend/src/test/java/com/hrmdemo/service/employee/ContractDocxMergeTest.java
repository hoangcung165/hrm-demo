package com.hrmdemo.service.employee;

import com.hrmdemo.exception.ApiException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Map;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ContractDocxMergeTest {
    private byte[] template(boolean splitRun, String field) throws Exception {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            var p = doc.createParagraph();
            if (splitRun) {
                p.createRun().setText("Hợp đồng: {{employee_");
                p.createRun().setText("name}}");
            } else {
                p.createRun().setText(field);
            }
            doc.write(out);
            return out.toByteArray();
        }
    }

    @Test void supportsVietnameseAndPlaceholdersSplitAcrossRuns() throws Exception {
        byte[] output = ContractDocxMerge.merge(template(true,null),
                Map.of("employee_name","Nguyễn Văn An"));
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(output))) {
            assertEquals("Hợp đồng: Nguyễn Văn An",doc.getParagraphs().get(0).getText());
        }
    }

    @Test void rejectsUnknownFieldsInsteadOfLeakingUnmergedTokens() throws Exception {
        ApiException ex = assertThrows(ApiException.class,() ->
                ContractDocxMerge.merge(template(false,"{{unknown_field}}"), Map.of()));
        assertEquals("contract_template.missing_fields",ex.getCode());
    }

    @Test void rejectsNonDocx() {
        ApiException ex = assertThrows(ApiException.class,() ->
                ContractDocxMerge.merge("not a docx".getBytes(),Map.of()));
        assertEquals("contract_template.invalid_docx",ex.getCode());
    }
}
