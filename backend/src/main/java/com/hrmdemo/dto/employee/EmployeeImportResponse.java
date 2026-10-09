package com.hrmdemo.dto.employee;

import java.util.List;
import java.util.UUID;

/**
 * What an import created, in row order (the codes were issued in that order).
 *
 * @param existingRows       rows skipped because the Employee already exists
 * @param skippedInvalidRows rows with errors, left out with {@code skipInvalid=true}
 */
public record EmployeeImportResponse(int createdCount, int existingRows, int skippedInvalidRows,
        List<Created> created) {

    /** @param row the Excel row number */
    public record Created(int row, UUID id, String code, String fullName) {
    }
}
