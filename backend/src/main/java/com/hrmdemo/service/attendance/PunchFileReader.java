package com.hrmdemo.service.attendance;

import java.io.ByteArrayInputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.hrmdemo.exception.ApiException;
import org.apache.poi.openxml4j.util.ZipSecureFile;
import org.apache.poi.poifs.filesystem.FileMagic;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;

/**
 * Reads the data rows of a punch log file: {@code .xlsx} (the first sheet) or CSV text (UTF-8, comma, semicolon or
 * tab). Row 1 is the header; columns are found by header text ({@link PunchColumn#ofHeader}). A row with every known
 * cell blank is skipped and not counted. Excel date and time cells are turned into text the {@link PunchTimeParser}
 * reads, so the rest of the import works on text only.
 * <p>
 * File-level problems are thrown as {@link ApiException}: {@code import.file_invalid}, {@code import.headers_invalid},
 * {@code import.empty} and {@code import.too_many_rows}.
 */
final class PunchFileReader {

    /** Most data rows of one file (blank rows not counted). */
    static final int MAX_ROWS = 50_000;

    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("uuuu-MM-dd");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm:ss");

    static {
        ZipSecureFile.setMaxEntrySize(50L * 1024 * 1024);
    }

    private PunchFileReader() {
    }

    static List<PunchRawRow> read(byte[] content) {
        if (content == null || content.length == 0) {
            throw fileInvalid();
        }
        List<List<String>> table = isXlsx(content) ? xlsx(content) : csv(content);
        return rows(table);
    }

    private static boolean isXlsx(byte[] content) {
        try {
            return FileMagic.valueOf(content) == FileMagic.OOXML;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private static List<List<String>> csv(byte[] content) {
        try {
            String text = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(content)).toString();
            return PunchCsv.parse(text);
        } catch (CharacterCodingException ex) {
            throw fileInvalid();
        }
    }

    private static List<List<String>> xlsx(byte[] content) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(content))) {
            if (workbook.getNumberOfSheets() == 0) {
                throw headersInvalid();
            }
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();
            List<List<String>> table = new ArrayList<>();
            for (int index = 0; index <= sheet.getLastRowNum(); index++) {
                Row row = sheet.getRow(index);
                List<String> cells = new ArrayList<>();
                int width = row == null ? 0 : row.getLastCellNum();
                for (int column = 0; column < width; column++) {
                    cells.add(text(row.getCell(column), formatter));
                }
                table.add(cells);
            }
            return table;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw fileInvalid();
        }
    }

    /** A cell as the text the parser reads; null when blank. */
    static String text(Cell cell, DataFormatter formatter) {
        if (cell == null) {
            return null;
        }
        CellType type = cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
        switch (type) {
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return dateText(cell.getNumericCellValue());
                }
                return blankToNull(formatter.formatCellValue(cell));
            case STRING:
                return blankToNull(cell.getStringCellValue());
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            default:
                return null;
        }
    }

    /** An Excel date serial as {@code yyyy-mm-dd}, {@code hh:mm:ss} (below 1), or both; rounded to the second. */
    static String dateText(double serial) {
        LocalDateTime value = DateUtil.getLocalDateTime(serial).plusNanos(500_000_000L).withNano(0);
        if (serial < 1) {
            return value.format(TIME);
        }
        return serial == Math.floor(serial) ? value.format(DATE) : value.format(DATE_TIME);
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.strip();
    }

    private static List<PunchRawRow> rows(List<List<String>> table) {
        if (table.isEmpty()) {
            throw headersInvalid();
        }
        Map<PunchColumn, Integer> columns = columns(table.get(0));
        List<PunchRawRow> rows = new ArrayList<>();
        int found = 0;
        for (int index = 1; index < table.size(); index++) {
            List<String> line = table.get(index);
            Map<PunchColumn, String> cells = new EnumMap<>(PunchColumn.class);
            for (Map.Entry<PunchColumn, Integer> column : columns.entrySet()) {
                String value = column.getValue() < line.size() ? blankToNull(line.get(column.getValue())) : null;
                if (value != null) {
                    cells.put(column.getKey(), value);
                }
            }
            if (cells.isEmpty()) {
                continue;
            }
            found++;
            // Past the limit only the count goes on, for the error.
            if (found <= MAX_ROWS) {
                rows.add(new PunchRawRow(index + 1, cells));
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

    /** The cell index of each column by its header; the code and a time column must be there. */
    private static Map<PunchColumn, Integer> columns(List<String> header) {
        Map<PunchColumn, Integer> columns = new LinkedHashMap<>();
        for (int index = 0; index < header.size(); index++) {
            Optional<PunchColumn> column = PunchColumn.ofHeader(header.get(index));
            // The first column of a kind wins.
            if (column.isPresent()) {
                columns.putIfAbsent(column.get(), index);
            }
        }
        return checked(columns);
    }

    private static Map<PunchColumn, Integer> checked(Map<PunchColumn, Integer> columns) {
        List<String> missing = new ArrayList<>();
        if (!columns.containsKey(PunchColumn.CODE)) {
            missing.add("CODE");
        }
        if (!columns.containsKey(PunchColumn.DATE_TIME) && !columns.containsKey(PunchColumn.TIME)) {
            missing.add("DATE_TIME");
        }
        if (!missing.isEmpty()) {
            throw headersInvalid().with("missing", missing);
        }
        return columns;
    }

    private static ApiException headersInvalid() {
        return new ApiException(HttpStatus.BAD_REQUEST, "import.headers_invalid",
                "The header row has no employee code or no time column");
    }

    private static ApiException fileInvalid() {
        return new ApiException(HttpStatus.BAD_REQUEST, "import.file_invalid", "The file cannot be read");
    }
}
