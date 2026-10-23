package com.hrmdemo.service.attendance;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.ZoneId;

import com.hrmdemo.service.attendance.PunchTimeParser.Parsed;
import org.junit.jupiter.api.Test;

class PunchTimeParserTest {

    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Test
    void aDateTimeWithoutOffsetIsWallClockTimeOfTheCompany() {
        assertThat(PunchTimeParser.parse("2026-10-20 08:03:10", null, null, ZONE).instant())
                .isEqualTo(Instant.parse("2026-10-20T01:03:10Z"));
        assertThat(PunchTimeParser.parse("2026-10-20T08:03", null, null, ZONE).instant())
                .isEqualTo(Instant.parse("2026-10-20T01:03:00Z"));
        assertThat(PunchTimeParser.parse("20/10/2026 8:03", null, null, ZONE).instant())
                .isEqualTo(Instant.parse("2026-10-20T01:03:00Z"));
    }

    @Test
    void aDateTimeWithAnOffsetIsExact() {
        assertThat(PunchTimeParser.parse("2026-10-20T08:03:00+07:00", null, null, ZONE).instant())
                .isEqualTo(Instant.parse("2026-10-20T01:03:00Z"));
        assertThat(PunchTimeParser.parse("2026-10-20T01:03:00Z", null, null, ZONE).instant())
                .isEqualTo(Instant.parse("2026-10-20T01:03:00Z"));
    }

    @Test
    void aDateAndATimeInTwoCellsAreJoined() {
        assertThat(PunchTimeParser.parse(null, "2026-10-20", "22:01", ZONE).instant())
                .isEqualTo(Instant.parse("2026-10-20T15:01:00Z"));
        assertThat(PunchTimeParser.parse(null, "3/1/2026", "7:59:30", ZONE).instant())
                .isEqualTo(Instant.parse("2026-01-03T00:59:30Z"));
    }

    @Test
    void aTimeCellThatHoldsADateTimeIsReadAsOne() {
        assertThat(PunchTimeParser.parse(null, null, "2026-10-20 08:00:00", ZONE).instant())
                .isEqualTo(Instant.parse("2026-10-20T01:00:00Z"));
    }

    @Test
    void monthFirstDatesAndImpossibleTimesAreInvalid() {
        assertThat(PunchTimeParser.parse("10/20/2026 08:00", null, null, ZONE)).isEqualTo(Parsed.error("time_invalid"));
        assertThat(PunchTimeParser.parse("2026-02-30 08:00", null, null, ZONE)).isEqualTo(Parsed.error("time_invalid"));
        assertThat(PunchTimeParser.parse(null, "2026-10-20", "25:00", ZONE)).isEqualTo(Parsed.error("time_invalid"));
        assertThat(PunchTimeParser.parse(null, null, "08:00", ZONE)).isEqualTo(Parsed.error("time_invalid"));
        assertThat(PunchTimeParser.parse("yesterday", null, null, ZONE)).isEqualTo(Parsed.error("time_invalid"));
    }

    @Test
    void nothingToReadIsMissing() {
        assertThat(PunchTimeParser.parse(null, null, null, ZONE)).isEqualTo(Parsed.error("time_missing"));
        assertThat(PunchTimeParser.parse(null, "2026-10-20", null, ZONE)).isEqualTo(Parsed.error("time_missing"));
    }
}
