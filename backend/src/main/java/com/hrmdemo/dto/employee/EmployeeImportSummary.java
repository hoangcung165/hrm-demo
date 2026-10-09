package com.hrmdemo.dto.employee;

/**
 * Counts of an import check. Blank rows are not counted, so {@code totalRows = validRows + errorRows +
 * existingRows}.
 */
public record EmployeeImportSummary(int totalRows, int validRows, int errorRows, int existingRows) {
}
