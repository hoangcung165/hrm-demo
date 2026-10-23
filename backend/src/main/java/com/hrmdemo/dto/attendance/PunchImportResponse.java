package com.hrmdemo.dto.attendance;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The result of importing a punch log file.
 *
 * @param stored          punches stored by this import
 * @param alreadyImported valid punches that were stored already
 * @param refused         rows left out because of an error (only when the caller chose to skip them)
 */
@Schema(description = "The result of importing a punch log file")
public record PunchImportResponse(UUID importId, int rowsRead, int stored, int alreadyImported, int refused) {
}
