package com.hrmdemo.service.employee;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.ClientAnchor;
import org.apache.poi.ss.usermodel.Comment;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.DataValidation;
import org.apache.poi.ss.usermodel.DataValidationHelper;
import org.apache.poi.ss.usermodel.Drawing;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;

/**
 * Writes the Excel files of Employees: the import template and the export of the list. Sheet "Nhân viên" has the
 * header in row 1 and one Employee per row from row 2, in the order of {@link EmployeeColumn}; "Danh mục"
 * ({@link EmployeeReferenceSheet}) backs its dropdowns. The template adds "Hướng dẫn"; the export adds "Thông tin".
 * <p>
 * Pure Apache POI, no Spring and no database: callers pass plain rows. {@link SXSSFWorkbook} keeps only a window
 * of rows in memory.
 */
final class EmployeeWorkbook {

    static final String DATA_SHEET = "Nhân viên";
    static final String GUIDE_SHEET = "Hướng dẫn";
    static final String INFO_SHEET = "Thông tin";

    /** Most data rows one import file may have; the template's dropdowns cover this many rows. */
    static final int MAX_IMPORT_ROWS = 1000;

    static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int ROW_WINDOW = 100;

    private EmployeeWorkbook() {
    }

    /** The values a file may use, as of a date: active units (tree order) and active positions within reach. */
    record Reference(LocalDate asOf, List<UnitRow> units, List<PositionRow> positions) {
    }

    /** @param parentName the unit above, or null for a top-level unit */
    record UnitRow(String code, String name, String parentName) {
    }

    record PositionRow(String code, String name) {
    }

    /**
     * One Employee as exported. The identity numbers are already masked when the caller may not see them.
     *
     * @param managerCode the chosen Quản lý trực tiếp only (null when the Employee follows the unit head)
     * @param manager     the effective Quản lý trực tiếp as "Name (code)", or null
     */
    record EmployeeRow(String code, String fullName, LocalDate dateOfBirth, Gender gender, String idNumber,
            LocalDate idIssueDate, String idIssuePlace, String taxCode, String socialInsuranceNumber, String phone,
            String personalEmail, String address, String orgUnitCode, String positionCode, String managerCode,
            LocalDate hireDate, EmployeeStatus status, String orgUnitName, String positionName, String manager) {

        Object value(EmployeeColumn column) {
            return switch (column) {
                case CODE -> code;
                case FULL_NAME -> fullName;
                case DATE_OF_BIRTH -> dateOfBirth;
                case GENDER -> gender == null ? null : EmployeeColumn.genderLabel(gender);
                case ID_NUMBER -> idNumber;
                case ID_ISSUE_DATE -> idIssueDate;
                case ID_ISSUE_PLACE -> idIssuePlace;
                case TAX_CODE -> taxCode;
                case SOCIAL_INSURANCE_NUMBER -> socialInsuranceNumber;
                case PHONE -> phone;
                case PERSONAL_EMAIL -> personalEmail;
                case ADDRESS -> address;
                case ORG_UNIT_CODE -> orgUnitCode;
                case POSITION_CODE -> positionCode;
                case MANAGER_CODE -> managerCode;
                case HIRE_DATE -> hireDate;
                case STATUS -> status == null ? null : EmployeeColumn.statusLabel(status);
                case ORG_UNIT_NAME -> orgUnitName;
                case POSITION_NAME -> positionName;
                case MANAGER_NAME -> manager;
            };
        }
    }

    /**
     * The "Thông tin" sheet of an export.
     *
     * @param filters a one-line summary of the list filters, or "Không lọc"
     * @param masked  whether any identity number was masked
     */
    record ExportInfo(LocalDateTime exportedAt, String exportedBy, String filters, int count, boolean masked) {
    }

    /** The import template: "Nhân viên" with the header only, "Hướng dẫn", "Danh mục". */
    static byte[] template(Reference reference) {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(ROW_WINDOW)) {
            EmployeeWorkbookStyles styles = new EmployeeWorkbookStyles(workbook);
            Sheet data = workbook.createSheet(DATA_SHEET);
            List<EmployeeColumn> columns = EmployeeColumn.importColumns();
            writeHeader(workbook, data, styles, columns);
            addDropdowns(data, MAX_IMPORT_ROWS);
            writeGuide(workbook.createSheet(GUIDE_SHEET), styles);
            EmployeeReferenceSheet.write(workbook, styles, reference);
            workbook.setActiveSheet(0);
            return bytes(workbook);
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    /** An export: "Nhân viên" with every row and the read-only name columns, "Danh mục", "Thông tin". */
    static byte[] export(Reference reference, List<EmployeeRow> rows, ExportInfo info) {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(ROW_WINDOW)) {
            EmployeeWorkbookStyles styles = new EmployeeWorkbookStyles(workbook);
            Sheet data = workbook.createSheet(DATA_SHEET);
            List<EmployeeColumn> columns = List.of(EmployeeColumn.values());
            writeHeader(workbook, data, styles, columns);
            int rowIndex = 1;
            for (EmployeeRow employee : rows) {
                Row row = data.createRow(rowIndex++);
                for (EmployeeColumn column : columns) {
                    writeValue(row, column, employee.value(column), styles);
                }
            }
            addDropdowns(data, Math.max(MAX_IMPORT_ROWS, rows.size()));
            EmployeeReferenceSheet.write(workbook, styles, reference);
            writeInfo(workbook.createSheet(INFO_SHEET), styles, info);
            workbook.setActiveSheet(0);
            return bytes(workbook);
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    /** Row 1: bold headers with a note each, frozen, with a filter; the column formats below it. */
    private static void writeHeader(SXSSFWorkbook workbook, Sheet sheet, EmployeeWorkbookStyles styles,
            List<EmployeeColumn> columns) {
        CreationHelper factory = workbook.getCreationHelper();
        Drawing<?> drawing = sheet.createDrawingPatriarch();
        Row header = sheet.createRow(0);
        for (EmployeeColumn column : columns) {
            int index = column.ordinal();
            sheet.setColumnWidth(index, column.width * 256);
            sheet.setDefaultColumnStyle(index, styles.column(column));
            Cell cell = header.createCell(index);
            cell.setCellValue(column.header());
            cell.setCellStyle(column.muted() ? styles.headerMuted : styles.header);

            ClientAnchor anchor = factory.createClientAnchor();
            anchor.setCol1(index);
            anchor.setCol2(index + 3);
            anchor.setRow1(0);
            anchor.setRow2(4);
            Comment note = drawing.createCellComment(anchor);
            note.setString(factory.createRichTextString(column.how));
            note.setAuthor("HRM");
            cell.setCellComment(note);
        }
        sheet.createFreezePane(0, 1);
        sheet.setAutoFilter(new CellRangeAddress(0, 0, 0, columns.size() - 1));
    }

    private static void writeValue(Row row, EmployeeColumn column, Object value, EmployeeWorkbookStyles styles) {
        if (value == null || (value instanceof String text && text.isEmpty())) {
            return;
        }
        Cell cell = row.createCell(column.ordinal());
        if (value instanceof LocalDate date) {
            cell.setCellValue(date);
        } else {
            cell.setCellValue(value.toString());
        }
        cell.setCellStyle(styles.column(column));
    }

    /**
     * Dropdowns from the named ranges of "Danh mục" on rows 2 to {@code rows + 1}. A value typed in is warned about,
     * not refused: the server is the real check.
     */
    private static void addDropdowns(Sheet sheet, int rows) {
        DataValidationHelper helper = sheet.getDataValidationHelper();
        for (EmployeeColumn column : EmployeeColumn.importColumns()) {
            if (column.list == null) {
                continue;
            }
            CellRangeAddressList cells = new CellRangeAddressList(1, rows, column.ordinal(), column.ordinal());
            DataValidation validation = helper.createValidation(helper.createFormulaListConstraint(column.list),
                    cells);
            validation.setErrorStyle(DataValidation.ErrorStyle.WARNING);
            validation.setShowErrorBox(true);
            validation.createErrorBox("Giá trị chưa có trong danh mục",
                    "Chọn một giá trị ở sheet " + EmployeeReferenceSheet.NAME + ".");
            sheet.addValidationData(validation);
        }
    }

    /** "Hướng dẫn": the steps, a rule per column, one example row and the limits. Never imported. */
    private static void writeGuide(Sheet sheet, EmployeeWorkbookStyles styles) {
        int r = 0;
        styles.cell(sheet.createRow(r++), 0, "Hướng dẫn nhập nhân viên", styles.title);
        for (String step : List.of(
                "1. Điền mỗi người một dòng ở sheet “" + DATA_SHEET + "”, bắt đầu từ dòng 2.",
                "2. Cột có dấu * là bắt buộc.",
                "3. Mã đơn vị, Mã chức danh lấy ở sheet “" + EmployeeReferenceSheet.NAME + "”.",
                "4. Để trống Mã nhân viên, hệ thống cấp mã khi nhập.",
                "5. Lưu file .xlsx rồi tải lên ở trang Nhân viên → Nhập từ Excel.")) {
            sheet.createRow(r++).createCell(0).setCellValue(step);
        }

        r++;
        Row ruleHeader = sheet.createRow(r++);
        styles.headerCell(ruleHeader, 0, "Cột");
        styles.headerCell(ruleHeader, 1, "Bắt buộc");
        styles.headerCell(ruleHeader, 2, "Cách nhập");
        styles.headerCell(ruleHeader, 3, "Ví dụ");
        for (EmployeeColumn column : EmployeeColumn.importColumns()) {
            Row row = sheet.createRow(r++);
            styles.text(row, 0, column.letter() + " · " + column.label);
            styles.text(row, 1, column.required ? "Có" : "Không");
            styles.text(row, 2, column.how);
            styles.text(row, 3, example(column));
        }

        r++;
        styles.cell(sheet.createRow(r++), 0, "Ví dụ một dòng (không được nhập từ sheet này):", styles.bold);
        Row exampleHeader = sheet.createRow(r++);
        Row example = sheet.createRow(r++);
        for (EmployeeColumn column : EmployeeColumn.importColumns()) {
            styles.headerCell(exampleHeader, column.ordinal(), column.header());
            styles.text(example, column.ordinal(), example(column));
        }

        r++;
        sheet.createRow(r).createCell(0).setCellValue("Tối đa 1.000 dòng và 5 MB mỗi file. Nhân viên đã có "
                + "(trùng Mã nhân viên hoặc Số CCCD) được bỏ qua, không bị sửa.");
        sheet.setColumnWidth(0, 26 * 256);
        sheet.setColumnWidth(1, 12 * 256);
        sheet.setColumnWidth(2, 70 * 256);
        sheet.setColumnWidth(3, 28 * 256);
    }

    private static String example(EmployeeColumn column) {
        return column.example.isEmpty() ? "(trống)" : column.example;
    }

    /** "Thông tin": when and by whom, the filters, the count, and a note when numbers were masked. */
    private static void writeInfo(Sheet sheet, EmployeeWorkbookStyles styles, ExportInfo info) {
        styles.cell(sheet.createRow(0), 0, "Danh sách nhân viên", styles.title);
        infoRow(sheet, 2, "Xuất lúc", DATE_TIME.format(info.exportedAt()), styles);
        infoRow(sheet, 3, "Người xuất", info.exportedBy(), styles);
        infoRow(sheet, 4, "Bộ lọc", info.filters(), styles);
        Row count = sheet.createRow(5);
        styles.cell(count, 0, "Số nhân viên", styles.bold);
        count.createCell(1).setCellValue(info.count());
        if (info.masked()) {
            sheet.createRow(7).createCell(0).setCellValue("Số CCCD, mã số thuế, số sổ BHXH đã được che vì tài khoản "
                    + "không có quyền xem số đầy đủ.");
        }
        sheet.setColumnWidth(0, 16 * 256);
        sheet.setColumnWidth(1, 70 * 256);
    }

    private static void infoRow(Sheet sheet, int index, String label, String value, EmployeeWorkbookStyles styles) {
        Row row = sheet.createRow(index);
        styles.cell(row, 0, label, styles.bold);
        styles.text(row, 1, value);
    }

    private static byte[] bytes(SXSSFWorkbook workbook) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        return out.toByteArray();
    }
}
