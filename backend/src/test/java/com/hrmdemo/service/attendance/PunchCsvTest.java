package com.hrmdemo.service.attendance;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

class PunchCsvTest {

    @Test
    void aCommaSeparatedFileIsSplitIntoRows() {
        assertThat(PunchCsv.parse("code,time\nNV1,2026-10-20 08:00\nNV2,2026-10-20 08:05\n"))
                .containsExactly(List.of("code", "time"), List.of("NV1", "2026-10-20 08:00"),
                        List.of("NV2", "2026-10-20 08:05"));
    }

    @Test
    void theDelimiterIsTheOneTheHeaderUses() {
        assertThat(PunchCsv.parse("code;time\nNV1;08:00")).containsExactly(List.of("code", "time"),
                List.of("NV1", "08:00"));
        assertThat(PunchCsv.parse("code\ttime\nNV1\t08:00")).containsExactly(List.of("code", "time"),
                List.of("NV1", "08:00"));
    }

    @Test
    void aByteOrderMarkAndWindowsLineEndingsAreIgnored() {
        assertThat(PunchCsv.parse("﻿code,time\r\nNV1,08:00\r\n")).containsExactly(List.of("code", "time"),
                List.of("NV1", "08:00"));
    }

    @Test
    void aQuotedCellMayHoldTheDelimiterAQuoteAndALineBreak() {
        assertThat(PunchCsv.parse("code,device\nNV1,\"Gate, \"\"A\"\"\nnorth\"\n"))
                .containsExactly(List.of("code", "device"), List.of("NV1", "Gate, \"A\"\nnorth"));
    }

    @Test
    void blankLinesAreSkippedAndShortRowsKeepTheirCells() {
        assertThat(PunchCsv.parse("code,time,device\n\nNV1,08:00\n   \n")).containsExactly(
                List.of("code", "time", "device"), List.of("NV1", "08:00"));
    }

    @Test
    void textWithoutADelimiterIsOneColumn() {
        assertThat(PunchCsv.parse("code\nNV1")).containsExactly(List.of("code"), List.of("NV1"));
    }
}
