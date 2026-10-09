package com.hrmdemo.dto.employee;

import java.util.List;

/**
 * The check of an import file: nothing is written.
 *
 * @param checksum {@code sha256:} and the hex SHA-256 of the uploaded bytes; the import may send it back
 * @param errors   every failing cell, by row then column
 * @param rows     every data row, in file order
 */
public record EmployeeImportValidation(String fileName, String checksum, EmployeeImportSummary summary,
        List<EmployeeImportError> errors, List<EmployeeImportRow> rows) {
}
