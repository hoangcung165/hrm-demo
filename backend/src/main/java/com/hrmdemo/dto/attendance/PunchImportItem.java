package com.hrmdemo.dto.attendance;

import java.time.OffsetDateTime;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One earlier import of a Log quẹt thẻ, for "Lần nhập gần đây".
 *
 * @param importedBy the name of the Account that imported it, or null when that Account is gone
 * @param rowsStored punches stored; {@code rowsExisting} were already there and {@code rowsRefused} rows were left out
 */
public record PunchImportItem(UUID id, String fileName, OffsetDateTime importedAt,
        @Schema(nullable = true) String importedBy, int rowsRead, int rowsStored, int rowsExisting, int rowsRefused) {
}
