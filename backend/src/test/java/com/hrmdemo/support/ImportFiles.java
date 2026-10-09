package com.hrmdemo.support;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/**
 * Builds import files with POI for tests, as a person would fill them in: a header row and one row per Employee.
 * A {@link String} becomes a text cell, a {@link LocalDate} a date cell, a {@link Number} a numeric cell (what
 * Excel makes of digits typed into a General cell), and null an empty cell.
 */
public final class ImportFiles {

    /** The headers of the template, in its order (A–Q). */
    public static final List<String> HEADERS = List.of("Mã nhân viên", "Họ và tên *", "Ngày sinh *", "Giới tính *",
            "Số CCCD *", "Ngày cấp CCCD", "Nơi cấp CCCD", "Mã số thuế", "Số sổ BHXH", "Số điện thoại", "Email",
            "Địa chỉ", "Mã đơn vị *", "Mã chức danh *", "Mã NV quản lý", "Ngày vào làm *", "Trạng thái");

    private final String sheetName;
    private final List<String> headers;
    private final List<Map<String, Object>> rows = new ArrayList<>();

    private ImportFiles(String sheetName, List<String> headers) {
        this.sheetName = sheetName;
        this.headers = headers;
    }

    /** A file with the template's sheet name and headers. */
    public static ImportFiles template() {
        return new ImportFiles("Nhân viên", HEADERS);
    }

    public static ImportFiles of(String sheetName, List<String> headers) {
        return new ImportFiles(sheetName, headers);
    }

    /**
     * A new person with every required cell filled; change cells with {@link Person#set}.
     *
     * @param idNumber the 12-digit CCCD, as text
     */
    public static Person person(String fullName, String idNumber, String unitCode, String positionCode) {
        Person person = new Person();
        person.set("Họ và tên *", fullName)
                .set("Ngày sinh *", LocalDate.of(1994, 3, 12))
                .set("Giới tính *", "Nữ")
                .set("Số CCCD *", idNumber)
                .set("Mã đơn vị *", unitCode)
                .set("Mã chức danh *", positionCode)
                .set("Ngày vào làm *", LocalDate.of(2024, 7, 1));
        return person;
    }

    public ImportFiles add(Person person) {
        rows.add(person.cells);
        return this;
    }

    /** An empty row, which the import skips. */
    public ImportFiles blank() {
        rows.add(Map.of());
        return this;
    }

    public byte[] bytes() {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle date = workbook.createCellStyle();
            date.setDataFormat(workbook.createDataFormat().getFormat("dd/mm/yyyy"));
            Sheet sheet = workbook.createSheet(sheetName);
            Row header = sheet.createRow(0);
            for (int i = 0; i < headers.size(); i++) {
                header.createCell(i).setCellValue(headers.get(i));
            }
            for (int r = 0; r < rows.size(); r++) {
                Row row = sheet.createRow(r + 1);
                for (int i = 0; i < headers.size(); i++) {
                    Object value = rows.get(r).get(headers.get(i));
                    if (value == null) {
                        continue;
                    }
                    Cell cell = row.createCell(i);
                    if (value instanceof LocalDate day) {
                        cell.setCellValue(day);
                        cell.setCellStyle(date);
                    } else if (value instanceof Number number) {
                        cell.setCellValue(number.doubleValue());
                    } else {
                        cell.setCellValue(value.toString());
                    }
                }
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    /** The cells of one row by header. */
    public static final class Person {

        private final Map<String, Object> cells = new LinkedHashMap<>();

        public Person set(String header, Object value) {
            if (value == null) {
                cells.remove(header);
            } else {
                cells.put(header, value);
            }
            return this;
        }
    }
}
