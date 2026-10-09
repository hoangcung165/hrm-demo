package com.hrmdemo.dto.employee;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One failing cell of an import file. The web translates {@code code} (with {@code header}); the server sends no
 * text of its own.
 *
 * @param row       the Excel row number (the header is row 1)
 * @param column    the column letter in the template's layout, e.g. {@code E}
 * @param header    the template header without the required mark, e.g. {@code Số CCCD}
 * @param field     the path of the field in {@code POST /api/employees}, e.g. {@code identity.idNumber}
 * @param value     the cell as read, at most 100 characters; identity numbers masked without
 *                  EMPLOYEE_SENSITIVE_VIEW
 * @param otherRows only with {@code duplicate_in_file}: the other rows that have the same value
 * @param conflict  only with {@code taken}, and only when the caller's scope covers the Employee that holds the
 *                  number
 */
public record EmployeeImportError(
        int row,
        String column,
        String header,
        String field,
        @Schema(allowableValues = {"required", "too_long", "invalid", "out_of_range", "under_age", "not_id_number",
                "scientific_notation", "not_found", "inactive", "out_of_scope", "duplicate_in_file", "taken"})
        String code,
        @Schema(nullable = true) String value,
        @JsonInclude(JsonInclude.Include.NON_NULL) @Schema(nullable = true) List<Integer> otherRows,
        @JsonInclude(JsonInclude.Include.NON_NULL) @Schema(nullable = true) EmployeeRef conflict) {
}
