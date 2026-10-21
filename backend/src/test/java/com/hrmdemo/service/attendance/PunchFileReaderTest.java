package com.hrmdemo.service.attendance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import com.hrmdemo.exception.ApiException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

class PunchFileReaderTest {

    static byte[] csv(String text) {
        return text.getBytes(StandardCharsets.UTF_8);
    }

    static String code(ApiException ex) {
        return ex.getCode();
    }

    @Test
    void aCsvIsReadWithColumnsFoundByHeaderWhateverTheirOrderAccentsOrCase() {
        List<PunchRawRow> rows = PunchFileReader.read(csv(
                "STT,Thời gian,Mã nhân viên,Máy chấm công,Ghi chú\n1,2026-10-20 08:00,NV1,Cổng A,x\n"
                        + "2,2026-10-20 17:31,NV1,,\n"));

        assertThat(rows).extracting(PunchRawRow::row).containsExactly(2, 3);
        assertThat(rows.getFirst().cells()).containsEntry(PunchColumn.CODE, "NV1")
                .containsEntry(PunchColumn.DATE_TIME, "2026-10-20 08:00").containsEntry(PunchColumn.DEVICE, "Cổng A")
                .hasSize(3);
        assertThat(rows.get(1).cells()).doesNotContainKey(PunchColumn.DEVICE);
    }

    @Test
    void aDateColumnAndATimeColumnAreAccepted() {
        List<PunchRawRow> rows = PunchFileReader.read(csv("employee_code;date;time\nNV1;20/10/2026;08:00\n"));

        assertThat(rows.getFirst().cells()).containsEntry(PunchColumn.DATE, "20/10/2026")
                .containsEntry(PunchColumn.TIME, "08:00");
    }

    @Test
    void blankRowsAreSkippedAndNotCounted() {
        List<PunchRawRow> rows = PunchFileReader.read(csv("code,time\n,\nNV1,2026-10-20 08:00\n,\n"));

        assertThat(rows).extracting(PunchRawRow::row).containsExactly(3);
    }

    @Test
    void aFileWithoutTheCodeOrATimeColumnIsRefusedWithTheMissingOnes() {
        assertThatThrownBy(() -> PunchFileReader.read(csv("name,device\nAn,A\n")))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(code(ex)).isEqualTo("import.headers_invalid");
                    assertThat(ex.getProperties()).containsEntry("missing", List.of("CODE", "DATE_TIME"));
                });
    }

    @Test
    void aFileWithoutDataRowsIsEmpty() {
        assertThatThrownBy(() -> PunchFileReader.read(csv("code,time\n")))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(code(ex)).isEqualTo("import.empty"));
    }

    @Test
    void textThatIsNotUtf8AndNoFileAreUnreadable() {
        byte[] latin1 = new byte[] {'c', 'o', 'd', 'e', '\n', (byte) 0xE9, '\n'};
        assertThatThrownBy(() -> PunchFileReader.read(latin1)).isInstanceOfSatisfying(ApiException.class,
                ex -> assertThat(code(ex)).isEqualTo("import.file_invalid"));
        assertThatThrownBy(() -> PunchFileReader.read(new byte[0])).isInstanceOfSatisfying(ApiException.class,
                ex -> assertThat(code(ex)).isEqualTo("import.file_invalid"));
    }

    @Test
    void anExcelFileIsReadWithDateTimeDateAndTimeCellsAsText() throws Exception {
        byte[] file;
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Log");
            DataFormat formats = workbook.createDataFormat();
            CellStyle dateTime = workbook.createCellStyle();
            dateTime.setDataFormat(formats.getFormat("yyyy-mm-dd hh:mm:ss"));
            CellStyle date = workbook.createCellStyle();
            date.setDataFormat(formats.getFormat("yyyy-mm-dd"));
            CellStyle time = workbook.createCellStyle();
            time.setDataFormat(formats.getFormat("hh:mm:ss"));
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Mã NV");
            header.createCell(1).setCellValue("DateTime");
            header.createCell(2).setCellValue("Ngày");
            header.createCell(3).setCellValue("Giờ");
            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue(1234);
            setDate(row.createCell(1), dateTime, LocalDateTime.of(2026, 10, 20, 8, 3, 0));
            setDate(row.createCell(2), date, LocalDateTime.of(2026, 10, 20, 0, 0));
            Cell clock = row.createCell(3);
            clock.setCellStyle(time);
            clock.setCellValue(LocalTime.of(22, 1, 7).toSecondOfDay() / 86400.0);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            file = out.toByteArray();
        }

        List<PunchRawRow> rows = PunchFileReader.read(file);

        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst().row()).isEqualTo(2);
        assertThat(rows.getFirst().cells()).containsEntry(PunchColumn.CODE, "1234")
                .containsEntry(PunchColumn.DATE_TIME, "2026-10-20 08:03:00")
                .containsEntry(PunchColumn.DATE, "2026-10-20").containsEntry(PunchColumn.TIME, "22:01:07");
    }

    private static void setDate(Cell cell, CellStyle style, LocalDateTime value) {
        cell.setCellStyle(style);
        cell.setCellValue(value);
    }

    @Test
    void aSerialIsRoundedToTheSecondNotTruncated() {
        // 08:03:00 as Excel stores it is a hair under 0.33541666…; truncating would give 08:02:59.
        assertThat(PunchFileReader.dateText(46315 + (8 * 3600 + 3 * 60) / 86400.0 - 1e-10))
                .isEqualTo("2026-10-20 08:03:00");
    }
}
