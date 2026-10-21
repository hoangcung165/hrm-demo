package com.hrmdemo.service.attendance;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.attendance.PunchImportError;

/**
 * Checks the rows of a punch log file one by one, without the database: the Employee code is looked up through
 * {@link Employees}, the time is read by {@link PunchTimeParser}, and a punch that appears twice in the file (same
 * Employee, same instant) is an error from its second row on. Pure; the caller supplies the lookup and "now".
 */
final class PunchRowCheck {

    /** How far ahead of now a punch may be, for machines whose clock runs fast. */
    static final long FUTURE_SLACK_SECONDS = 300;
    /** Longest value echoed back in an error. */
    static final int MAX_ECHO = 100;

    /** What the check needs to know about the Employee codes of the file. */
    interface Employees {

        /** The Employee with the code (already upper-cased and trimmed), or null when there is none. */
        Known find(String code);
    }

    /** An Employee a code names, and whether the caller's data scope covers them. */
    record Known(UUID id, boolean inScope) {
    }

    /** A row that can be imported. */
    record Valid(int row, UUID employeeId, Instant punchedAt, String device) {
    }

    record Outcome(List<Valid> valid, List<PunchImportError> errors, int rowsRead) {
    }

    private PunchRowCheck() {
    }

    static String code(String text) {
        return text == null ? null : text.strip().toUpperCase(Locale.ROOT);
    }

    static Outcome check(List<PunchRawRow> rows, Employees employees, Instant now, ZoneId zone) {
        List<Valid> valid = new ArrayList<>();
        List<PunchImportError> errors = new ArrayList<>();
        Map<String, Integer> firstSeen = new HashMap<>();
        Instant latest = now.plusSeconds(FUTURE_SLACK_SECONDS);
        for (PunchRawRow row : rows) {
            String code = code(row.cell(PunchColumn.CODE));
            if (code == null) {
                errors.add(new PunchImportError(row.row(), "employee_code_missing", null, null));
                continue;
            }
            PunchRowCheck.Known employee = employees.find(code);
            if (employee == null) {
                errors.add(new PunchImportError(row.row(), "employee_not_found", echo(code), null));
                continue;
            }
            if (!employee.inScope()) {
                errors.add(new PunchImportError(row.row(), "out_of_scope", echo(code), null));
                continue;
            }
            PunchTimeParser.Parsed time = PunchTimeParser.parse(row.cell(PunchColumn.DATE_TIME),
                    row.cell(PunchColumn.DATE), row.cell(PunchColumn.TIME), zone);
            if (time.error() != null) {
                errors.add(new PunchImportError(row.row(), time.error(), echo(timeText(row)), null));
                continue;
            }
            if (time.instant().isAfter(latest)) {
                errors.add(new PunchImportError(row.row(), "in_future", echo(timeText(row)), null));
                continue;
            }
            Integer first = firstSeen.putIfAbsent(employee.id() + "@" + time.instant(), row.row());
            if (first != null) {
                errors.add(new PunchImportError(row.row(), "duplicate_in_file", echo(timeText(row)), first));
                continue;
            }
            valid.add(new Valid(row.row(), employee.id(), time.instant(), row.cell(PunchColumn.DEVICE)));
        }
        return new Outcome(valid, errors, rows.size());
    }

    /** The time cells of a row as written, for an error. */
    private static String timeText(PunchRawRow row) {
        String dateTime = row.cell(PunchColumn.DATE_TIME);
        if (dateTime != null) {
            return dateTime;
        }
        String date = row.cell(PunchColumn.DATE);
        String time = row.cell(PunchColumn.TIME);
        if (date != null && time != null) {
            return date + " " + time;
        }
        return date != null ? date : time;
    }

    private static String echo(String value) {
        if (value == null) {
            return null;
        }
        return value.length() <= MAX_ECHO ? value : value.substring(0, MAX_ECHO);
    }
}
