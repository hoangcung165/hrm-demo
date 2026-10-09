package com.hrmdemo.service.employee;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Workbook;

/** The few cell styles of the employee workbooks. A workbook allows a limited number, so they are shared. */
final class EmployeeWorkbookStyles {

    static final String DATE_FORMAT = "dd/mm/yyyy";
    static final String TEXT_FORMAT = "@";

    final CellStyle header;
    final CellStyle headerMuted;
    final CellStyle text;
    final CellStyle textMuted;
    final CellStyle date;
    final CellStyle bold;
    final CellStyle title;
    final CellStyle caption;

    EmployeeWorkbookStyles(Workbook workbook) {
        DataFormat format = workbook.createDataFormat();
        Font boldFont = workbook.createFont();
        boldFont.setBold(true);
        Font titleFont = workbook.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short) 14);
        Font italic = workbook.createFont();
        italic.setItalic(true);

        header = headerStyle(workbook, boldFont, IndexedColors.GREY_25_PERCENT);
        headerMuted = headerStyle(workbook, boldFont, IndexedColors.GREY_40_PERCENT);
        text = workbook.createCellStyle();
        text.setDataFormat(format.getFormat(TEXT_FORMAT));
        textMuted = workbook.createCellStyle();
        textMuted.cloneStyleFrom(text);
        textMuted.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        textMuted.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        date = workbook.createCellStyle();
        date.setDataFormat(format.getFormat(DATE_FORMAT));
        bold = workbook.createCellStyle();
        bold.setFont(boldFont);
        title = workbook.createCellStyle();
        title.setFont(titleFont);
        caption = workbook.createCellStyle();
        caption.setFont(italic);
    }

    /** Text columns keep what is typed as text (leading zeros); date columns show dd/mm/yyyy. */
    CellStyle column(EmployeeColumn column) {
        if (column.kind == EmployeeColumn.Kind.DATE) {
            return date;
        }
        return column.muted() ? textMuted : text;
    }

    /** A cell of {@code style}; nothing for a null value. */
    void cell(Row row, int index, String value, CellStyle style) {
        if (value == null) {
            return;
        }
        Cell cell = row.createCell(index);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    void text(Row row, int index, String value) {
        cell(row, index, value, text);
    }

    void headerCell(Row row, int index, String value) {
        cell(row, index, value, header);
    }

    private static CellStyle headerStyle(Workbook workbook, Font font, IndexedColors fill) {
        CellStyle style = workbook.createCellStyle();
        style.setFont(font);
        style.setFillForegroundColor(fill.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setWrapText(true);
        return style;
    }
}
