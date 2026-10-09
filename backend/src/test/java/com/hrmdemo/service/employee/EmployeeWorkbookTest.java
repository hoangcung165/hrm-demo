package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import com.hrmdemo.service.employee.EmployeeWorkbook.EmployeeRow;
import com.hrmdemo.service.employee.EmployeeWorkbook.ExportInfo;
import com.hrmdemo.service.employee.EmployeeWorkbook.PositionRow;
import com.hrmdemo.service.employee.EmployeeWorkbook.Reference;
import com.hrmdemo.service.employee.EmployeeWorkbook.UnitRow;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DataValidation;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Name;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

/** The workbook writer, read back with POI as Excel would open it. */
class EmployeeWorkbookTest {

    static final Reference REFERENCE = new Reference(LocalDate.of(2026, 10, 9),
            List.of(new UnitRow("PTPM", "Phòng Phát triển phần mềm", null),
                    new UnitRow("WEB", "Nhóm Web", "Phòng Phát triển phần mềm")),
            List.of(new PositionRow("CV", "Chuyên viên"), new PositionRow("TN", "Trưởng nhóm"),
                    new PositionRow("TTS", "Thực tập sinh")));

    static final List<String> IMPORT_HEADERS = List.of("Mã nhân viên", "Họ và tên *", "Ngày sinh *", "Giới tính *",
            "Số CCCD *", "Ngày cấp CCCD", "Nơi cấp CCCD", "Mã số thuế", "Số sổ BHXH", "Số điện thoại", "Email",
            "Địa chỉ", "Mã đơn vị *", "Mã chức danh *", "Mã NV quản lý", "Ngày vào làm *", "Trạng thái");

    @Test
    void theTemplateHasTheThreeSheetsAndOnlyTheHeaderRow() throws IOException {
        try (XSSFWorkbook workbook = read(EmployeeWorkbook.template(REFERENCE))) {
            assertThat(sheetNames(workbook)).containsExactly("Nhân viên", "Hướng dẫn", "Danh mục");
            assertThat(workbook.getActiveSheetIndex()).isZero();
            XSSFSheet data = workbook.getSheet("Nhân viên");
            assertThat(headers(data)).containsExactlyElementsOf(IMPORT_HEADERS);
            assertThat(data.getLastRowNum()).as("no example person on the data sheet").isZero();
            assertThat(data.getPaneInformation().isFreezePane()).isTrue();
            assertThat(data.getRow(0).getCell(0).getCellStyle().getFont().getBold()).isTrue();
            assertThat(data.getCellComment(new org.apache.poi.ss.util.CellAddress("E1")).getString().getString())
                    .isEqualTo("12 chữ số. Định dạng ô là Text để giữ số 0 đầu.");
        }
    }

    @Test
    void numberColumnsAreTextAndDateColumnsAreDatesBelowTheHeader() throws IOException {
        try (XSSFWorkbook workbook = read(EmployeeWorkbook.template(REFERENCE))) {
            Sheet data = workbook.getSheet("Nhân viên");
            for (String column : List.of("A", "E", "H", "I", "J", "M", "N", "O")) {
                assertThat(data.getColumnStyle(index(column)).getDataFormatString()).as(column).isEqualTo("@");
            }
            for (String column : List.of("C", "F", "P")) {
                assertThat(data.getColumnStyle(index(column)).getDataFormatString()).as(column)
                        .isEqualTo("dd/mm/yyyy");
            }
        }
    }

    @Test
    void theDropdownsPointAtNamedRangesOverTheReferenceCodes() throws IOException {
        try (XSSFWorkbook workbook = read(EmployeeWorkbook.template(REFERENCE))) {
            Map<String, String> listByColumn = dropdowns(workbook.getSheet("Nhân viên"));
            assertThat(listByColumn).containsOnly(Map.entry("D2:D1001", "GioiTinh"),
                    Map.entry("M2:M1001", "DonVi"), Map.entry("N2:N1001", "ChucDanh"),
                    Map.entry("Q2:Q1001", "TrangThai"));
            assertThat(workbook.getSheet("Nhân viên").getDataValidations())
                    .allMatch(validation -> validation.getErrorStyle() == DataValidation.ErrorStyle.WARNING);

            assertThat(refersTo(workbook, "DonVi")).isEqualTo("'Danh mục'!$A$4:$A$5");
            assertThat(refersTo(workbook, "ChucDanh")).isEqualTo("'Danh mục'!$E$4:$E$6");
            assertThat(refersTo(workbook, "GioiTinh")).isEqualTo("'Danh mục'!$H$4:$H$5");
            assertThat(refersTo(workbook, "TrangThai")).isEqualTo("'Danh mục'!$J$4:$J$5");
            Sheet reference = workbook.getSheet("Danh mục");
            assertThat(column(reference, 0)).containsExactly("PTPM", "WEB");
            assertThat(column(reference, 2)).containsExactly("Phòng Phát triển phần mềm");
            assertThat(column(reference, 4)).containsExactly("CV", "TN", "TTS");
            assertThat(column(reference, 7)).containsExactly("Nam", "Nữ");
            assertThat(column(reference, 9)).as("never Đã nghỉ việc").containsExactly("Thử việc", "Chính thức");
            assertThat(reference.getRow(0).getCell(0).getStringCellValue()).startsWith("Danh mục tại ngày 09/10/2026.");
            assertThat(workbook.getSheet("Danh mục").getProtect()).isTrue();
        }
    }

    @Test
    void anEmptyReferenceListStillGivesAValidNamedRange() throws IOException {
        try (XSSFWorkbook workbook = read(EmployeeWorkbook.template(
                new Reference(LocalDate.of(2026, 10, 9), List.of(), List.of())))) {
            assertThat(refersTo(workbook, "DonVi")).isEqualTo("'Danh mục'!$A$4:$A$4");
        }
    }

    @Test
    void theGuideListsEveryImportColumnAndAnExampleRow() throws IOException {
        try (XSSFWorkbook workbook = read(EmployeeWorkbook.template(REFERENCE))) {
            Sheet guide = workbook.getSheet("Hướng dẫn");
            List<String> texts = new ArrayList<>();
            guide.forEach(row -> row.forEach(cell -> texts.add(cell.getStringCellValue())));
            assertThat(texts).contains("Hướng dẫn nhập nhân viên", "E · Số CCCD", "Đỗ Thị Hoa", "001195012345")
                    .anyMatch(text -> text.startsWith("Tối đa 1.000 dòng và 5 MB"));
        }
    }

    @Test
    void anExportWritesEveryRowWithTypedCellsTheNameColumnsAndTheInfoSheet() throws IOException {
        EmployeeRow row = new EmployeeRow("NV00007", "Lê Văn Hùng", LocalDate.of(1990, 6, 18), Gender.MALE,
                "••••••••3456", LocalDate.of(2021, 5, 1), "Cục CS QLHC về TTXH", "••••••••3456", null, "0912345678",
                "hung.le@example.com", null, "WEB", "TN", "NV00002", LocalDate.of(2018, 7, 2),
                EmployeeStatus.OFFICIAL, "Nhóm Web", "Trưởng nhóm", "Nguyễn Văn Khoa (NV00002)");
        ExportInfo info = new ExportInfo(LocalDateTime.of(2026, 10, 9, 14, 30), "Trần Thị Mai",
                "Nhóm Web (gồm đơn vị con)", 1, true);

        try (XSSFWorkbook workbook = read(EmployeeWorkbook.export(REFERENCE, List.of(row), info))) {
            assertThat(sheetNames(workbook)).containsExactly("Nhân viên", "Danh mục", "Thông tin");
            Sheet data = workbook.getSheet("Nhân viên");
            List<String> headers = new ArrayList<>(IMPORT_HEADERS);
            headers.addAll(List.of("Tên đơn vị", "Tên chức danh", "Quản lý trực tiếp"));
            assertThat(headers(data)).containsExactlyElementsOf(headers);

            Row written = data.getRow(1);
            assertThat(text(written, "A")).isEqualTo("NV00007");
            assertThat(text(written, "D")).isEqualTo("Nam");
            assertThat(text(written, "E")).isEqualTo("••••••••3456");
            assertThat(written.getCell(index("I"))).as("an empty number stays empty").isNull();
            assertThat(text(written, "J")).isEqualTo("0912345678");
            assertThat(text(written, "Q")).isEqualTo("Chính thức");
            assertThat(text(written, "T")).isEqualTo("Nguyễn Văn Khoa (NV00002)");
            Cell born = written.getCell(index("C"));
            assertThat(born.getCellType()).isEqualTo(CellType.NUMERIC);
            assertThat(DateUtil.isCellDateFormatted(born)).isTrue();
            assertThat(born.getLocalDateTimeCellValue().toLocalDate()).isEqualTo(LocalDate.of(1990, 6, 18));
            assertThat(new DataFormatter().formatCellValue(born)).isEqualTo("18/06/1990");

            Sheet about = workbook.getSheet("Thông tin");
            assertThat(about.getRow(2).getCell(1).getStringCellValue()).isEqualTo("09/10/2026 14:30");
            assertThat(about.getRow(3).getCell(1).getStringCellValue()).isEqualTo("Trần Thị Mai");
            assertThat(about.getRow(4).getCell(1).getStringCellValue()).isEqualTo("Nhóm Web (gồm đơn vị con)");
            assertThat(about.getRow(5).getCell(1).getNumericCellValue()).isEqualTo(1);
            assertThat(about.getRow(7).getCell(0).getStringCellValue()).startsWith("Số CCCD, mã số thuế");
        }
    }

    @Test
    void anExportWithoutMaskedNumbersHasNoMaskNote() throws IOException {
        ExportInfo info = new ExportInfo(LocalDateTime.of(2026, 10, 9, 14, 30), "Admin", "Không lọc", 0, false);
        try (XSSFWorkbook workbook = read(EmployeeWorkbook.export(REFERENCE, List.of(), info))) {
            assertThat(workbook.getSheet("Thông tin").getRow(7) == null).isTrue();
            assertThat(workbook.getSheet("Nhân viên").getLastRowNum()).isZero();
        }
    }

    @Test
    void theImportFindsAColumnByItsHeaderWhateverTheCaseSpacingAndStar() {
        assertThat(EmployeeColumn.ofHeader("  số   cccd * ")).contains(EmployeeColumn.ID_NUMBER);
        assertThat(EmployeeColumn.ofHeader("Mã nhân viên")).contains(EmployeeColumn.CODE);
        assertThat(EmployeeColumn.ofHeader("Tên đơn vị")).as("read-only export column").isEmpty();
        assertThat(EmployeeColumn.ofHeader("Ghi chú")).isEmpty();
        assertThat(EmployeeColumn.ofHeader(null)).isEmpty();
    }

    private static XSSFWorkbook read(byte[] bytes) throws IOException {
        return new XSSFWorkbook(new ByteArrayInputStream(bytes));
    }

    private static List<String> sheetNames(XSSFWorkbook workbook) {
        List<String> names = new ArrayList<>();
        workbook.forEach(sheet -> names.add(sheet.getSheetName()));
        return names;
    }

    private static List<String> headers(Sheet sheet) {
        List<String> headers = new ArrayList<>();
        sheet.getRow(0).forEach(cell -> headers.add(cell.getStringCellValue()));
        return headers;
    }

    private static Map<String, String> dropdowns(XSSFSheet sheet) {
        return sheet.getDataValidations().stream().collect(Collectors.toMap(
                validation -> validation.getRegions().getCellRangeAddress(0).formatAsString(),
                validation -> validation.getValidationConstraint().getFormula1()));
    }

    private static String refersTo(XSSFWorkbook workbook, String name) {
        Name found = workbook.getName(name);
        return found == null ? null : found.getRefersToFormula();
    }

    /** The values of one column of "Danh mục", below its header. */
    private static List<String> column(Sheet sheet, int index) {
        List<String> values = new ArrayList<>();
        for (int r = EmployeeReferenceSheet.HEADER_ROW + 1; r <= sheet.getLastRowNum(); r++) {
            Cell cell = sheet.getRow(r).getCell(index);
            if (cell != null) {
                values.add(cell.getStringCellValue());
            }
        }
        return values;
    }

    private static String text(Row row, String column) {
        Cell cell = row.getCell(index(column));
        assertThat(cell.getCellType()).as(column).isEqualTo(CellType.STRING);
        assertThat(cell.getCellStyle().getDataFormatString()).as(column).isEqualTo("@");
        return cell.getStringCellValue();
    }

    private static int index(String column) {
        return org.apache.poi.ss.util.CellReference.convertColStringToIndex(column);
    }
}
