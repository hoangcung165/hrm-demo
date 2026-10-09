package com.hrmdemo.service.employee;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.time.LocalDate;

import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import com.hrmdemo.service.employee.EmployeeSheetCells.SheetCell;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** How one cell of an import file is read: text, numbers that lost their zeros, dates, genders and statuses. */
class EmployeeSheetCellsTest {

    XSSFWorkbook workbook;
    Row row;
    int next;

    @BeforeEach
    void setUp() {
        workbook = new XSSFWorkbook();
        row = workbook.createSheet("Nhân viên").createRow(1);
    }

    @AfterEach
    void tearDown() throws IOException {
        workbook.close();
    }

    @Test
    void textIsTrimmedAndABlankCellIsNothing() {
        assertThat(read(text("  Trần Thị Mai "), EmployeeColumn.FULL_NAME).text()).isEqualTo("Trần Thị Mai");
        assertThat(read(text("   "), EmployeeColumn.FULL_NAME).blank()).isTrue();
        assertThat(EmployeeSheetCells.read(null, EmployeeColumn.FULL_NAME).blank()).isTrue();
        assertThat(read(row.createCell(next++), EmployeeColumn.FULL_NAME).blank()).isTrue();
    }

    @Test
    void aCccdTypedAsTextKeepsItsZeros() {
        SheetCell cell = read(text("001195012345"), EmployeeColumn.ID_NUMBER);

        assertThat(cell.text()).isEqualTo("001195012345");
        assertThat(cell.error()).isNull();
    }

    @Test
    void aNumberColumnGivenAsANumberGetsBackTheZerosExcelDropped() {
        // 079… lost one zero, Hà Nội's 001… lost two.
        assertThat(read(number(79194005678d), EmployeeColumn.ID_NUMBER).text()).isEqualTo("079194005678");
        assertThat(read(number(1195012345d), EmployeeColumn.ID_NUMBER).text()).isEqualTo("001195012345");
        assertThat(read(number(101234567d), EmployeeColumn.TAX_CODE).text()).isEqualTo("0101234567");
        assertThat(read(number(79194005678d), EmployeeColumn.TAX_CODE).text()).as("11 digits: the 12-digit form")
                .isEqualTo("079194005678");
        assertThat(read(number(7912341234d), EmployeeColumn.SOCIAL_INSURANCE_NUMBER).text()).isEqualTo("7912341234");
        assertThat(read(number(912345678d), EmployeeColumn.PHONE).text()).isEqualTo("0912345678");
        assertThat(read(number(42d), EmployeeColumn.ORG_UNIT_CODE).text()).as("not a number column").isEqualTo("42");
    }

    @Test
    void aFractionInANumberColumnAndScientificTextAreRefused() {
        assertThat(read(number(12.5), EmployeeColumn.ID_NUMBER).error()).isEqualTo("invalid");
        SheetCell scientific = read(text("7,9194E+10"), EmployeeColumn.ID_NUMBER);
        assertThat(scientific.error()).isEqualTo("scientific_notation");
        assertThat(scientific.text()).isEqualTo("7,9194E+10");
        assertThat(read(text("1.23E+11"), EmployeeColumn.PHONE).error()).isEqualTo("scientific_notation");
    }

    @Test
    void aDateColumnTakesADateCellASerialOrDayFirstText() {
        assertThat(read(date(LocalDate.of(1995, 3, 15)), EmployeeColumn.DATE_OF_BIRTH).date())
                .isEqualTo(LocalDate.of(1995, 3, 15));
        // 34773 is 15/03/1995 in Excel's 1900 date system, in a cell without a date format.
        assertThat(read(number(34773), EmployeeColumn.DATE_OF_BIRTH).date()).isEqualTo(LocalDate.of(1995, 3, 15));
        assertThat(read(text("15/03/1995"), EmployeeColumn.HIRE_DATE).date()).isEqualTo(LocalDate.of(1995, 3, 15));
        assertThat(read(text("5/3/1995"), EmployeeColumn.HIRE_DATE).date()).isEqualTo(LocalDate.of(1995, 3, 5));
        assertThat(read(text("1995-03-15"), EmployeeColumn.ID_ISSUE_DATE).date()).isEqualTo(LocalDate.of(1995, 3, 15));
    }

    @Test
    void anythingElseInADateColumnIsInvalidAndMonthFirstIsNeverGuessed() {
        for (String text : new String[] {"03/15/1995", "31/02/1995", "15.03.1995", "hôm qua"}) {
            SheetCell cell = read(text(text), EmployeeColumn.DATE_OF_BIRTH);
            assertThat(cell.error()).as(text).isEqualTo("invalid");
            assertThat(cell.date()).isNull();
            assertThat(cell.text()).isEqualTo(text);
        }
        assertThat(read(number(-3), EmployeeColumn.DATE_OF_BIRTH).error()).isEqualTo("invalid");
        Cell bool = row.createCell(next++);
        bool.setCellValue(true);
        assertThat(read(bool, EmployeeColumn.DATE_OF_BIRTH).error()).isEqualTo("invalid");
    }

    @Test
    void aFormulaIsReadFromItsCachedValue() {
        Cell formula = row.createCell(next++);
        formula.setCellFormula("\"Nhóm \"&\"Web\"");
        workbook.getCreationHelper().createFormulaEvaluator().evaluateFormulaCell(formula);

        assertThat(read(formula, EmployeeColumn.FULL_NAME).text()).isEqualTo("Nhóm Web");
    }

    @Test
    void genderAndStatusIgnoreCaseAndAccentsAndNeverTakeSomeoneWhoLeft() {
        assertThat(EmployeeSheetCells.gender("Nữ")).isEqualTo(Gender.FEMALE);
        assertThat(EmployeeSheetCells.gender(" nu ")).isEqualTo(Gender.FEMALE);
        assertThat(EmployeeSheetCells.gender("MALE")).isEqualTo(Gender.MALE);
        assertThat(EmployeeSheetCells.gender("nam")).isEqualTo(Gender.MALE);
        assertThat(EmployeeSheetCells.gender("khác")).isNull();
        assertThat(EmployeeSheetCells.status("thu viec")).isEqualTo(EmployeeStatus.PROBATION);
        assertThat(EmployeeSheetCells.status("Chính thức")).isEqualTo(EmployeeStatus.OFFICIAL);
        assertThat(EmployeeSheetCells.status("OFFICIAL")).isEqualTo(EmployeeStatus.OFFICIAL);
        assertThat(EmployeeSheetCells.status("Đã nghỉ việc")).isNull();
        assertThat(EmployeeSheetCells.status("INACTIVE")).isNull();
    }

    @Test
    void anEchoedIdentityNumberIsMaskedWithoutThePermissionAndLongValuesAreCut() {
        assertThat(EmployeeSheetCells.echo("079194005678", EmployeeColumn.ID_NUMBER, false)).isEqualTo("••••••••5678");
        assertThat(EmployeeSheetCells.echo("079194005678", EmployeeColumn.ID_NUMBER, true)).isEqualTo("079194005678");
        assertThat(EmployeeSheetCells.echo("0912345678", EmployeeColumn.PHONE, false)).isEqualTo("0912345678");
        assertThat(EmployeeSheetCells.echo("x".repeat(300), EmployeeColumn.ADDRESS, true)).hasSize(100);
        assertThat(EmployeeSheetCells.echo(null, EmployeeColumn.ADDRESS, true)).isNull();
    }

    private SheetCell read(Cell cell, EmployeeColumn column) {
        return EmployeeSheetCells.read(cell, column);
    }

    private Cell text(String value) {
        Cell cell = row.createCell(next++);
        cell.setCellValue(value);
        return cell;
    }

    private Cell number(double value) {
        Cell cell = row.createCell(next++);
        cell.setCellValue(value);
        return cell;
    }

    private Cell date(LocalDate value) {
        CellStyle style = workbook.createCellStyle();
        style.setDataFormat(workbook.createDataFormat().getFormat("dd/mm/yyyy"));
        Cell cell = row.createCell(next++);
        cell.setCellValue(value);
        cell.setCellStyle(style);
        return cell;
    }
}
