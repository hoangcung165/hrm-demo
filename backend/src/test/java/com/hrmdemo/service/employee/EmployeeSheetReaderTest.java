package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import com.hrmdemo.exception.ApiException;
import com.hrmdemo.service.employee.EmployeeSheetReader.SheetRow;
import com.hrmdemo.support.ImportFiles;
import org.junit.jupiter.api.Test;

/** Reading an import file: the sheet, the headers by text, blank rows and the file-level errors. */
class EmployeeSheetReaderTest {

    @Test
    void theTemplateIsReadRowByRowWithExcelRowNumbersAndBlankRowsSkipped() {
        byte[] file = ImportFiles.template()
                .add(ImportFiles.person("Trần Thị Mai", "079194005678", "WEB", "CV"))
                .blank()
                .add(ImportFiles.person("Lê Văn Hùng", "040090123456", "WEB", "TN"))
                .bytes();

        List<SheetRow> rows = EmployeeSheetReader.read(file);

        assertThat(rows).extracting(SheetRow::row).containsExactly(2, 4);
        assertThat(rows.getFirst().text(EmployeeColumn.FULL_NAME)).isEqualTo("Trần Thị Mai");
        assertThat(rows.getFirst().cell(EmployeeColumn.DATE_OF_BIRTH).date()).isEqualTo(LocalDate.of(1994, 3, 12));
        assertThat(rows.getFirst().text(EmployeeColumn.CODE)).isNull();
    }

    @Test
    void ourOwnTemplateAndExportAreReadBack() {
        byte[] template = EmployeeWorkbook.template(new EmployeeWorkbook.Reference(LocalDate.of(2026, 10, 9),
                List.of(), List.of()));
        assertThatThrownBy(() -> EmployeeSheetReader.read(template)).as("headers only")
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.getCode()).isEqualTo("import.empty"));
    }

    @Test
    void columnsAreFoundByHeaderTextInAnyOrderAndUnknownOnesAreIgnored() {
        List<String> headers = List.of("ghi chú", "số cccd", "HỌ VÀ TÊN", "Ngày sinh", "Giới tính", "Mã đơn vị",
                "Mã chức danh", "Ngày vào làm", "Tên đơn vị");
        byte[] file = ImportFiles.of("Sheet1", headers).add(new ImportFiles.Person()
                .set("ghi chú", "bỏ qua").set("số cccd", "079194005678").set("HỌ VÀ TÊN", "Trần Thị Mai")
                .set("Tên đơn vị", "Nhóm Web")).bytes();

        SheetRow row = EmployeeSheetReader.read(file).getFirst();

        assertThat(row.text(EmployeeColumn.ID_NUMBER)).isEqualTo("079194005678");
        assertThat(row.text(EmployeeColumn.FULL_NAME)).isEqualTo("Trần Thị Mai");
        assertThat(row.cells()).containsOnlyKeys(EmployeeColumn.ID_NUMBER, EmployeeColumn.FULL_NAME);
    }

    @Test
    void anExportIsReadBackWithItsCodeAndMaskedNumbersAndTheNameColumnsIgnored() {
        EmployeeWorkbook.EmployeeRow exported = new EmployeeWorkbook.EmployeeRow("NV00007", "Lê Văn Hùng",
                LocalDate.of(1990, 6, 18), com.hrmdemo.entity.employee.Gender.MALE, "••••••••3456", null, null,
                "••••••••3456", null, "0912345678", null, null, "WEB", "TN", null, LocalDate.of(2018, 7, 2),
                com.hrmdemo.entity.employee.EmployeeStatus.OFFICIAL, "Nhóm Web", "Trưởng nhóm", "Nguyễn Văn Khoa");
        byte[] file = EmployeeWorkbook.export(new EmployeeWorkbook.Reference(LocalDate.of(2026, 10, 9), List.of(),
                List.of()), List.of(exported), new EmployeeWorkbook.ExportInfo(java.time.LocalDateTime.now(), "HR",
                "Không lọc", 1, true));

        SheetRow row = EmployeeSheetReader.read(file).getFirst();

        assertThat(row.row()).isEqualTo(2);
        assertThat(row.text(EmployeeColumn.CODE)).isEqualTo("NV00007");
        assertThat(row.text(EmployeeColumn.ID_NUMBER)).isEqualTo("••••••••3456");
        assertThat(row.text(EmployeeColumn.GENDER)).isEqualTo("Nam");
        assertThat(row.cell(EmployeeColumn.HIRE_DATE).date()).isEqualTo(LocalDate.of(2018, 7, 2));
        assertThat(row.cells()).doesNotContainKeys(EmployeeColumn.ORG_UNIT_NAME, EmployeeColumn.MANAGER_NAME);
    }

    @Test
    void aMissingRequiredHeaderNamesTheMissingColumns() {
        byte[] file = ImportFiles.of("Nhân viên", List.of("Họ và tên *", "Số CCCD *"))
                .add(new ImportFiles.Person().set("Họ và tên *", "Mai")).bytes();

        assertThatThrownBy(() -> EmployeeSheetReader.read(file)).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getCode()).isEqualTo("import.headers_invalid");
            assertThat(ex.getStatus().value()).isEqualTo(400);
            assertThat(ex.getProperties().get("missing")).isEqualTo(List.of("Ngày sinh *", "Giới tính *",
                    "Mã đơn vị *", "Mã chức danh *", "Ngày vào làm *"));
            assertThat(ex.getProperties().get("found")).isEqualTo(List.of("Họ và tên *", "Số CCCD *"));
        });
    }

    @Test
    void aFileWithOnlyBlankRowsIsEmpty() {
        byte[] file = ImportFiles.template().blank().blank().bytes();

        assertCode(file, "import.empty");
    }

    @Test
    void moreThanAThousandRowsIsRefusedWithTheCount() {
        ImportFiles files = ImportFiles.template();
        for (int i = 0; i < 1001; i++) {
            files.add(ImportFiles.person("Người " + i, "%012d".formatted(i), "WEB", "CV"));
        }

        assertThatThrownBy(() -> EmployeeSheetReader.read(files.bytes()))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getCode()).isEqualTo("import.too_many_rows");
                    assertThat(ex.getProperties()).containsEntry("limit", 1000).containsEntry("found", 1001);
                });
    }

    @Test
    void anythingButAnXlsxIsUnreadable() {
        assertCode("Họ và tên;Số CCCD\n".getBytes(StandardCharsets.UTF_8), "import.file_invalid");
        // The OLE2 header of a legacy .xls (and of a password-protected .xlsx).
        assertCode(new byte[] {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A,
            (byte) 0xE1, 0, 0, 0, 0}, "import.file_invalid");
        // A zip that is not a workbook.
        assertCode(new byte[] {'P', 'K', 3, 4, 0, 0, 0, 0}, "import.file_invalid");
        assertCode(new byte[0], "import.file_invalid");
    }

    private static void assertCode(byte[] file, String code) {
        assertThatThrownBy(() -> EmployeeSheetReader.read(file))
                .isInstanceOfSatisfying(ApiException.class, ex -> assertThat(ex.getCode()).isEqualTo(code));
    }
}
