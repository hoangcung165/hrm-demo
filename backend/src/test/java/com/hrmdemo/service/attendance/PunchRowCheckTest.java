package com.hrmdemo.service.attendance;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.attendance.PunchImportError;
import com.hrmdemo.service.attendance.PunchRowCheck.Known;
import com.hrmdemo.service.attendance.PunchRowCheck.Outcome;
import org.junit.jupiter.api.Test;

class PunchRowCheckTest {

    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final Instant NOW = Instant.parse("2026-10-21T03:00:00Z");
    static final UUID AN = UUID.randomUUID();
    static final UUID BINH = UUID.randomUUID();
    static final UUID OUTSIDE = UUID.randomUUID();
    static final Map<String, Known> KNOWN = Map.of("NV1", new Known(AN, true), "NV2", new Known(BINH, true),
            "NV9", new Known(OUTSIDE, false));

    static PunchRawRow row(int number, String code, String dateTime) {
        Map<PunchColumn, String> cells = new EnumMap<>(PunchColumn.class);
        if (code != null) {
            cells.put(PunchColumn.CODE, code);
        }
        if (dateTime != null) {
            cells.put(PunchColumn.DATE_TIME, dateTime);
        }
        return new PunchRawRow(number, cells);
    }

    static Outcome check(PunchRawRow... rows) {
        return PunchRowCheck.check(List.of(rows), KNOWN::get, NOW, ZONE);
    }

    @Test
    void aValidRowKeepsItsRowEmployeeInstantAndDevice() {
        Map<PunchColumn, String> cells = new EnumMap<>(PunchColumn.class);
        cells.put(PunchColumn.CODE, " nv1 ");
        cells.put(PunchColumn.DATE_TIME, "2026-10-20 08:00");
        cells.put(PunchColumn.DEVICE, "Gate A");

        Outcome outcome = check(new PunchRawRow(2, cells));

        assertThat(outcome.errors()).isEmpty();
        assertThat(outcome.valid()).containsExactly(
                new PunchRowCheck.Valid(2, AN, Instant.parse("2026-10-20T01:00:00Z"), "Gate A"));
    }

    @Test
    void eachCauseOfErrorHasItsOwnCodeAndTheRowNumber() {
        Outcome outcome = check(row(2, null, "2026-10-20 08:00"), row(3, "NV404", "2026-10-20 08:00"),
                row(4, "NV9", "2026-10-20 08:00"), row(5, "NV1", null), row(6, "NV1", "20.10.2026"),
                row(7, "NV1", "2026-10-22 08:00"));

        assertThat(outcome.valid()).isEmpty();
        assertThat(outcome.errors()).containsExactly(
                new PunchImportError(2, "employee_code_missing", null, null),
                new PunchImportError(3, "employee_not_found", "NV404", null),
                new PunchImportError(4, "out_of_scope", "NV9", null),
                new PunchImportError(5, "time_missing", null, null),
                new PunchImportError(6, "time_invalid", "20.10.2026", null),
                new PunchImportError(7, "in_future", "2026-10-22 08:00", null));
    }

    @Test
    void thePunchOfTheNextFewMinutesIsNotInTheFuture() {
        assertThat(check(row(2, "NV1", "2026-10-21 10:04")).errors()).isEmpty();
        assertThat(check(row(2, "NV1", "2026-10-21 10:06")).errors()).extracting(PunchImportError::code)
                .containsExactly("in_future");
    }

    @Test
    void theSamePunchTwiceIsAnErrorFromItsSecondRowOn() {
        Outcome outcome = check(row(2, "NV1", "2026-10-20 08:00"), row(3, "NV2", "2026-10-20 08:00"),
                row(4, "NV1", "2026-10-20 08:00:00"), row(5, "nv1", "20/10/2026 8:00"));

        assertThat(outcome.valid()).extracting(PunchRowCheck.Valid::row).containsExactly(2, 3);
        assertThat(outcome.errors()).containsExactly(
                new PunchImportError(4, "duplicate_in_file", "2026-10-20 08:00:00", 2),
                new PunchImportError(5, "duplicate_in_file", "20/10/2026 8:00", 2));
    }

    @Test
    void differentInstantsOfTheSamePersonAreDifferentPunches() {
        Outcome outcome = check(row(2, "NV1", "2026-10-20 08:00:00"), row(3, "NV1", "2026-10-20 08:00:01"));

        assertThat(outcome.errors()).isEmpty();
        assertThat(outcome.valid()).hasSize(2);
        assertThat(outcome.rowsRead()).isEqualTo(2);
    }

    @Test
    void aLongValueIsCutInTheError() {
        Outcome outcome = check(row(2, "NV1", "x".repeat(300)));

        assertThat(outcome.errors().getFirst().value()).hasSize(PunchRowCheck.MAX_ECHO);
    }
}
