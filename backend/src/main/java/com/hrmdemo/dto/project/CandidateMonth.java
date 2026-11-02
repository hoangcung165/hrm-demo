package com.hrmdemo.dto.project;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The highest Tải phân bổ in one calendar month of the range, for the load strip.
 *
 * @param month {@code yyyy-MM}
 */
public record CandidateMonth(@Schema(example = "2026-11") String month, int peakPercent) {
}
