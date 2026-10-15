package com.hrmdemo.service.employee;

import com.hrmdemo.exception.ApiException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.http.HttpStatus;

/** DOCX merge without regex substitution on OOXML, including placeholders split across Word runs. */
public final class ContractDocxMerge {
    private static final Pattern FIELD = Pattern.compile("\\{\\{([a-zA-Z][a-zA-Z0-9_]*)\\}\\}");
    private ContractDocxMerge() {}

    public static byte[] merge(byte[] template, Map<String,String> values) {
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(template));
                ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Set<String> missing = new HashSet<>();
            for (XWPFParagraph p : doc.getParagraphs()) replace(p,values,missing);
            for (XWPFTable table : doc.getTables()) replaceTable(table,values,missing);
            for (XWPFHeader header : doc.getHeaderList()) {
                for (XWPFParagraph p : header.getParagraphs()) replace(p,values,missing);
                for (XWPFTable t : header.getTables()) replaceTable(t,values,missing);
            }
            for (XWPFFooter footer : doc.getFooterList()) {
                for (XWPFParagraph p : footer.getParagraphs()) replace(p,values,missing);
                for (XWPFTable t : footer.getTables()) replaceTable(t,values,missing);
            }
            if (!missing.isEmpty()) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"contract_template.missing_fields",
                        "Missing fields: " + String.join(", ",missing.stream().sorted().toList()));
            }
            doc.write(out);
            return out.toByteArray();
        } catch (IOException | RuntimeException ex) {
            if (ex instanceof ApiException api) throw api;
            throw new ApiException(HttpStatus.BAD_REQUEST,"contract_template.invalid_docx",
                    "Cannot process this DOCX template");
        }
    }

    private static void replaceTable(XWPFTable table,Map<String,String> values,Set<String> missing) {
        for (XWPFTableRow row : table.getRows()) for (XWPFTableCell cell : row.getTableCells()) {
            for (XWPFParagraph p : cell.getParagraphs()) replace(p,values,missing);
            for (XWPFTable t : cell.getTables()) replaceTable(t,values,missing);
        }
    }

    private static void replace(XWPFParagraph paragraph,Map<String,String> values,Set<String> missing) {
        var runs = paragraph.getRuns();
        if (runs.isEmpty()) return;
        StringBuilder original = new StringBuilder();
        for (XWPFRun run : runs) original.append(run.text());
        Matcher m = FIELD.matcher(original);
        StringBuffer output = new StringBuffer();
        boolean found = false;
        while (m.find()) {
            found = true;
            String key = m.group(1);
            String value = values.get(key);
            if (value == null) { missing.add(key); value = ""; }
            m.appendReplacement(output,Matcher.quoteReplacement(value));
        }
        if (!found) return;
        m.appendTail(output);
        // Retain paragraph and first run's typography; split-field run formatting is not preserved.
        XWPFRun first = runs.get(0);
        first.setText(output.toString(),0);
        for (int i = runs.size()-1; i > 0; i--) paragraph.removeRun(i);
    }
}
