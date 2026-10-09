package com.hrmdemo.service.employee;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.hrmdemo.exception.ApiException;
import com.hrmdemo.service.employee.EmployeeSheetCells.SheetCell;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.poifs.filesystem.FileMagic;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;

/**
 * Reads the data rows of an import file. Only {@code .xlsx} is read. The data sheet is "Nhân viên", or the first
 * sheet when there is none of that name. Row 1 is the header; columns are found by header text
 * ({@link EmployeeColumn#ofHeader}), so their order does not matter and unknown columns (the export's name
 * columns) are ignored. A row with every known cell blank is skipped and not counted.
 * <p>
 * File-level problems are thrown as {@link ApiException}: {@code import.file_invalid}, {@code import.headers_invalid},
 * {@code import.empty} and {@code import.too_many_rows}.
 */
final class EmployeeSheetReader {

    /** Most data rows of one file (blank rows not counted). */
    static final int MAX_ROWS = EmployeeWorkbook.MAX_IMPORT_ROWS;
    /** Largest part a file may unpack to, so a zip bomb fails as an unreadable file instead of using up memory. */
    static final long MAX_ENTRY_BYTES = 50L * 1024 * 1024;

    static {
        // The default minimum inflate ratio (1%) stays; only the entry size is capped.
        ZipSecureFile.setMaxEntrySize(MAX_ENTRY_BYTES);
    }

    private EmployeeSheetReader() {
    }

    /** One data row: its Excel row number (the header is row 1) and the cells of the columns found. */
    record SheetRow(int row, Map<EmployeeColumn, SheetCell> cells) {

        SheetCell cell(EmployeeColumn column) {
            return cells.getOrDefault(column, SheetCell.BLANK);
        }

        /** The text of a column, or null when blank. */
        String text(EmployeeColumn column) {
            return cell(column).text();
        }
    }

    static List<SheetRow> read(byte[] content) {
        if (content == null || content.length == 0 || !isXlsx(content)) {
            throw fileInvalid();
        }
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            return rows(dataSheet(workbook));
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            // A corrupt zip, a part that is not OOXML, or a zip-bomb guard.
            throw fileInvalid();
        }
    }

    /** An OOXML zip. A legacy .xls and a password-protected .xlsx are OLE2 files and are refused. */
    private static boolean isXlsx(byte[] content) {
        try {
            return FileMagic.valueOf(content) == FileMagic.OOXML;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private static Sheet dataSheet(XSSFWorkbook workbook) {
        Sheet named = workbook.getSheet(EmployeeWorkbook.DATA_SHEET);
        if (named != null) {
            return named;
        }
        if (workbook.getNumberOfSheets() == 0) {
            throw headersInvalid(List.of(), List.of());
        }
        return workbook.getSheetAt(0);
    }

    private static List<SheetRow> rows(Sheet sheet) {
        Map<EmployeeColumn, Integer> columns = columns(sheet.getRow(0));
        List<SheetRow> rows = new ArrayList<>();
        int found = 0;
        for (int index = 1; index <= sheet.getLastRowNum(); index++) {
            Row row = sheet.getRow(index);
            if (row == null) {
                continue;
            }
            Map<EmployeeColumn, SheetCell> cells = new EnumMap<>(EmployeeColumn.class);
            boolean blank = true;
            for (Map.Entry<EmployeeColumn, Integer> column : columns.entrySet()) {
                Cell cell = row.getCell(column.getValue());
                SheetCell value = EmployeeSheetCells.read(cell, column.getKey());
                if (!value.blank()) {
                    cells.put(column.getKey(), value);
                    blank = false;
                }
            }
            if (blank) {
                continue;
            }
            found++;
            // Past the limit only the count goes on, for the error.
            if (found <= MAX_ROWS) {
                rows.add(new SheetRow(index + 1, cells));
            }
        }
        if (found > MAX_ROWS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "import.too_many_rows",
                    "The file has more data rows than one import may hold")
                    .with("limit", MAX_ROWS)
                    .with("found", found);
        }
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "import.empty", "The file has no data row");
        }
        return rows;
    }

    /** The cell index of each import column by its header; every required column must be there. */
    private static Map<EmployeeColumn, Integer> columns(Row header) {
        Map<EmployeeColumn, Integer> columns = new LinkedHashMap<>();
        List<String> found = new ArrayList<>();
        if (header != null) {
            DataFormatter formatter = new DataFormatter();
            for (Cell cell : header) {
                String text = formatter.formatCellValue(cell).strip();
                if (!text.isEmpty()) {
                    found.add(text);
                }
                EmployeeColumn.ofHeader(text).ifPresent(column -> columns.putIfAbsent(column, cell.getColumnIndex()));
            }
        }
        List<String> missing = EmployeeColumn.importColumns().stream()
                .filter(column -> column.required && !columns.containsKey(column))
                .map(EmployeeColumn::header)
                .toList();
        if (!missing.isEmpty()) {
            throw headersInvalid(missing, found);
        }
        return columns;
    }

    private static ApiException headersInvalid(List<String> missing, List<String> found) {
        return new ApiException(HttpStatus.BAD_REQUEST, "import.headers_invalid",
                "Row 1 of the data sheet does not have the template's required columns")
                .with("missing", missing)
                .with("found", found);
    }

    private static ApiException fileInvalid() {
        return new ApiException(HttpStatus.BAD_REQUEST, "import.file_invalid",
                "The file is not a readable .xlsx workbook");
    }
}
