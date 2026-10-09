package com.hrmdemo.service.employee;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.List;
import java.util.regex.Pattern;

import com.hrmdemo.entity.SearchText;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.entity.employee.Gender;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;

/**
 * Reads one cell of an import file the way the template means it. Pure functions, no POI workbook state.
 * <ul>
 *   <li>Text is trimmed; a blank cell is null.</li>
 *   <li>A number column (CCCD, MST, số BHXH, phone) given as a numeric cell gets back the leading zeros Excel
 *       dropped: CCCD to 12 digits, MST and số BHXH to 10 (or 12 from 11), phone to 10. Every valid length is
 *       fixed, so the padding is unambiguous. Text like {@code 7.9194E+10} lost digits and is refused
 *       ({@code scientific_notation}).</li>
 *   <li>A date column takes a date cell, an Excel date serial, or text {@code dd/mm/yyyy}, {@code d/m/yyyy} or
 *       {@code yyyy-mm-dd}; never {@code mm/dd}. Anything else is {@code invalid}.</li>
 *   <li>A formula cell is read from its cached value; it is never evaluated.</li>
 * </ul>
 */
final class EmployeeSheetCells {

    /** Longest value echoed back in an error. */
    static final int MAX_ECHO = 100;

    private static final List<DateTimeFormatter> DATE_TEXT = List.of(
            DateTimeFormatter.ofPattern("d/M/uuuu").withResolverStyle(ResolverStyle.STRICT),
            DateTimeFormatter.ofPattern("uuuu-MM-dd").withResolverStyle(ResolverStyle.STRICT));
    private static final Pattern SCIENTIFIC = Pattern.compile("[0-9]+([.,][0-9]+)?[eE][+-]?[0-9]+");
    /** A serial below 1 or after 9999-12-31 is no date. */
    private static final double MAX_DATE_SERIAL = 2_958_465;

    private EmployeeSheetCells() {
    }

    /**
     * One cell as read.
     *
     * @param text  the value as text: what the import uses for a text column, and what an error echoes
     * @param date  the date of a date column, or null
     * @param error a read error code ({@code invalid}, {@code scientific_notation}), or null
     */
    record SheetCell(String text, LocalDate date, String error) {

        static final SheetCell BLANK = new SheetCell(null, null, null);

        boolean blank() {
            return text == null && date == null && error == null;
        }
    }

    static SheetCell read(Cell cell, EmployeeColumn column) {
        if (cell == null) {
            return SheetCell.BLANK;
        }
        CellType type = cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType()
                : cell.getCellType();
        return switch (type) {
            case STRING -> fromText(cell.getStringCellValue(), column);
            case NUMERIC -> fromNumber(cell, column);
            case BOOLEAN -> new SheetCell(String.valueOf(cell.getBooleanCellValue()), null, "invalid");
            case ERROR -> new SheetCell("#ERROR", null, "invalid");
            default -> SheetCell.BLANK;
        };
    }

    static SheetCell fromText(String raw, EmployeeColumn column) {
        String text = raw == null ? null : raw.strip();
        if (text == null || text.isEmpty()) {
            return SheetCell.BLANK;
        }
        if (column.kind == EmployeeColumn.Kind.DATE) {
            LocalDate date = parseDate(text);
            return new SheetCell(text, date, date == null ? "invalid" : null);
        }
        if (numberColumn(column) && SCIENTIFIC.matcher(text.replace(" ", "")).matches()) {
            return new SheetCell(text, null, "scientific_notation");
        }
        return new SheetCell(text, null, null);
    }

    private static SheetCell fromNumber(Cell cell, EmployeeColumn column) {
        double value = cell.getNumericCellValue();
        if (column.kind == EmployeeColumn.Kind.DATE) {
            if (DateUtil.isCellDateFormatted(cell) || (value >= 1 && value <= MAX_DATE_SERIAL)) {
                LocalDateTime dateTime = DateUtil.getLocalDateTime(value);
                LocalDate date = dateTime.toLocalDate();
                return new SheetCell(EmployeeWorkbook.DATE.format(date), date, null);
            }
            return new SheetCell(plain(value), null, "invalid");
        }
        String text = plain(value);
        if (!text.matches("[0-9]+")) {
            // A fraction or a negative number is no code and no identity number.
            return new SheetCell(text, null, numberColumn(column) ? "invalid" : null);
        }
        return new SheetCell(numberColumn(column) ? restoreZeros(text, column) : text, null, null);
    }

    /** Puts back the leading zeros Excel drops from a number stored as a number. */
    static String restoreZeros(String digits, EmployeeColumn column) {
        int length = digits.length();
        int target = switch (column) {
            case ID_NUMBER -> 12;
            case TAX_CODE, SOCIAL_INSURANCE_NUMBER -> length == 11 ? 12 : 10;
            case PHONE -> 10;
            default -> length;
        };
        return length >= target ? digits : "0".repeat(target - length) + digits;
    }

    static boolean numberColumn(EmployeeColumn column) {
        return column == EmployeeColumn.ID_NUMBER || column == EmployeeColumn.TAX_CODE
                || column == EmployeeColumn.SOCIAL_INSURANCE_NUMBER || column == EmployeeColumn.PHONE;
    }

    static LocalDate parseDate(String text) {
        for (DateTimeFormatter format : DATE_TEXT) {
            try {
                return LocalDate.parse(text, format);
            } catch (DateTimeParseException ex) {
                // Try the next format.
            }
        }
        return null;
    }

    /** {@code Nam} / {@code Nữ}, also {@code MALE} / {@code FEMALE}, ignoring case and accents; null otherwise. */
    static Gender gender(String text) {
        return switch (SearchText.of(text)) {
            case "nam", "male" -> Gender.MALE;
            case "nu", "female" -> Gender.FEMALE;
            default -> null;
        };
    }

    /**
     * {@code Thử việc} / {@code Chính thức}, also {@code PROBATION} / {@code OFFICIAL}, ignoring case and accents;
     * null for anything else, Đã nghỉ việc included (an import never adds someone who left).
     */
    static EmployeeStatus status(String text) {
        return switch (SearchText.of(text)) {
            case "thu viec", "probation" -> EmployeeStatus.PROBATION;
            case "chinh thuc", "official" -> EmployeeStatus.OFFICIAL;
            default -> null;
        };
    }

    /** A value as an error echoes it: at most {@link #MAX_ECHO} characters, masked for an identity number. */
    static String echo(String text, EmployeeColumn column, boolean unmasked) {
        if (text == null) {
            return null;
        }
        String shown = column.sensitive() && !unmasked ? SensitiveNumbers.mask(text) : text;
        return shown.length() > MAX_ECHO ? shown.substring(0, MAX_ECHO) : shown;
    }

    private static String plain(double value) {
        return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
    }
}
