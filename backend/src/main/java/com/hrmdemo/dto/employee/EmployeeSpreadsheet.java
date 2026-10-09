package com.hrmdemo.dto.employee;

/**
 * A generated {@code .xlsx} file: the import template or an export of the employee list.
 *
 * @param fileName  the name to download it as
 * @param content   the workbook bytes
 * @param rowCount  the Employees in the file (0 for the template)
 */
public record EmployeeSpreadsheet(String fileName, byte[] content, int rowCount) {

    public static final String CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}
