package com.hrmdemo.dto.attendance;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The result of checking a punch log file; nothing was stored.
 *
 * @param checksum {@code sha256:} and the hex digest of the file, to send back with the import
 * @param errors   the first rows that cannot be imported, at most {@code MAX_ERRORS_LISTED}; the number of all of them
 *                 is {@code summary.errorRows}
 */
@Schema(description = "The result of checking a punch log file")
public record PunchImportValidation(String fileName, String checksum, PunchImportSummary summary,
        List<PunchImportError> errors) {

    public static final int MAX_ERRORS_LISTED = 1000;
}
