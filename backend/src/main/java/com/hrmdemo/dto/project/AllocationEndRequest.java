package com.hrmdemo.dto.project;

import java.time.LocalDate;

/** Kết thúc sớm: the new last day, from the start day to the day before the current end. */
public record AllocationEndRequest(LocalDate endDate) {
}
