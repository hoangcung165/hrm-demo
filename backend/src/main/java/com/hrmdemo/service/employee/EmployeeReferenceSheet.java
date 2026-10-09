package com.hrmdemo.service.employee;

import java.util.Arrays;
import java.util.List;

import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import com.hrmdemo.service.employee.EmployeeWorkbook.PositionRow;
import com.hrmdemo.service.employee.EmployeeWorkbook.Reference;
import com.hrmdemo.service.employee.EmployeeWorkbook.UnitRow;
import org.apache.poi.ss.usermodel.Name;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;

/**
 * Sheet "Danh mục": the codes a file may use, in four tables side by side (units A–C, positions E–F, genders H,
 * statuses J). A named range over each code column backs the dropdowns of sheet "Nhân viên". The sheet is
 * protected without a password, against accidental edits.
 */
final class EmployeeReferenceSheet {

    static final String NAME = "Danh mục";

    static final String UNITS_RANGE = "DonVi";
    static final String POSITIONS_RANGE = "ChucDanh";
    static final String GENDERS_RANGE = "GioiTinh";
    static final String STATUSES_RANGE = "TrangThai";

    /** Row (0-based) of the table headers; the values start on the next row. */
    static final int HEADER_ROW = 2;

    /** The statuses a file may set: an import never sets Đã nghỉ việc. */
    static final List<EmployeeStatus> STATUSES = List.of(EmployeeStatus.PROBATION, EmployeeStatus.OFFICIAL);

    private static final int[] WIDTHS = {13, 30, 30, 2, 15, 30, 2, 11, 2, 13};

    private EmployeeReferenceSheet() {
    }

    static void write(SXSSFWorkbook workbook, EmployeeWorkbookStyles styles, Reference reference) {
        Sheet sheet = workbook.createSheet(NAME);
        styles.cell(sheet.createRow(0), 0, "Danh mục tại ngày " + EmployeeWorkbook.DATE.format(reference.asOf())
                + ". Tải lại file mẫu nếu đơn vị hoặc chức danh thay đổi.", styles.caption);

        Row header = sheet.createRow(HEADER_ROW);
        styles.headerCell(header, 0, "Mã đơn vị");
        styles.headerCell(header, 1, "Tên đơn vị");
        styles.headerCell(header, 2, "Thuộc");
        styles.headerCell(header, 4, "Mã chức danh");
        styles.headerCell(header, 5, "Tên chức danh");
        styles.headerCell(header, 7, "Giới tính");
        styles.headerCell(header, 9, "Trạng thái");

        List<UnitRow> units = reference.units();
        List<PositionRow> positions = reference.positions();
        List<String> genders = Arrays.stream(Gender.values()).map(EmployeeColumn::genderLabel).toList();
        List<String> statuses = STATUSES.stream().map(EmployeeColumn::statusLabel).toList();
        int length = Math.max(Math.max(units.size(), positions.size()), Math.max(genders.size(), statuses.size()));
        for (int i = 0; i < length; i++) {
            Row row = sheet.createRow(HEADER_ROW + 1 + i);
            if (i < units.size()) {
                styles.text(row, 0, units.get(i).code());
                styles.text(row, 1, units.get(i).name());
                styles.text(row, 2, units.get(i).parentName());
            }
            if (i < positions.size()) {
                styles.text(row, 4, positions.get(i).code());
                styles.text(row, 5, positions.get(i).name());
            }
            if (i < genders.size()) {
                styles.text(row, 7, genders.get(i));
            }
            if (i < statuses.size()) {
                styles.text(row, 9, statuses.get(i));
            }
        }
        for (int i = 0; i < WIDTHS.length; i++) {
            sheet.setColumnWidth(i, WIDTHS[i] * 256);
        }

        name(workbook, UNITS_RANGE, "A", units.size());
        name(workbook, POSITIONS_RANGE, "E", positions.size());
        name(workbook, GENDERS_RANGE, "H", genders.size());
        name(workbook, STATUSES_RANGE, "J", statuses.size());
        workbook.getXSSFWorkbook().getSheet(NAME).enableLocking();
    }

    /** A named range over {@code count} cells of a column (one empty cell when there are none, so it stays valid). */
    private static void name(SXSSFWorkbook workbook, String rangeName, String column, int count) {
        int first = HEADER_ROW + 2;
        int last = first + Math.max(count, 1) - 1;
        Name name = workbook.createName();
        name.setNameName(rangeName);
        name.setRefersToFormula("'%s'!$%s$%d:$%s$%d".formatted(NAME, column, first, column, last));
    }
}
