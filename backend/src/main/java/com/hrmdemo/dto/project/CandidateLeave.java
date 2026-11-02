package com.hrmdemo.dto.project;

import java.time.LocalDate;

/** Approved leave within the range, cut to it. Shown for information; it does not lower the Tải phân bổ. */
public record CandidateLeave(LocalDate from, LocalDate to) {
}
