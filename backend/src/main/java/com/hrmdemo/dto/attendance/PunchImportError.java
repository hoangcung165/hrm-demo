package com.hrmdemo.dto.attendance;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * A row of a punch log file that cannot be imported.
 *
 * @param row      the row in the file (the header is row 1)
 * @param code     {@code employee_code_missing}, {@code employee_not_found}, {@code out_of_scope},
 *                 {@code time_missing}, {@code time_invalid}, {@code in_future} or {@code duplicate_in_file}
 * @param value    the cell the problem is in (the code or the time as written), cut to 100 characters; null if none
 * @param firstRow for {@code duplicate_in_file}: the row where the same punch first appears
 */
@Schema(description = "A row of a punch log file that cannot be imported")
public record PunchImportError(int row, String code, String value, Integer firstRow) {
}
