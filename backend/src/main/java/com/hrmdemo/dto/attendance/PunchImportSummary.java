package com.hrmdemo.dto.attendance;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * What a punch log file holds.
 *
 * @param rowsRead        data rows read (blank rows are not counted)
 * @param newPunches      punches that would be stored: valid and not stored yet
 * @param alreadyImported valid punches that are stored already; importing them again changes nothing
 * @param errorRows       rows that cannot be imported
 * @param employees       distinct Employees among the valid rows
 * @param from            earliest valid punch, or null
 * @param to              latest valid punch, or null
 */
@Schema(description = "What a punch log file holds")
public record PunchImportSummary(int rowsRead, int newPunches, int alreadyImported, int errorRows, int employees,
        Instant from, Instant to) {
}
