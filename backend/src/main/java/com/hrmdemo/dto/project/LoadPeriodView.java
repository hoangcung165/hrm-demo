package com.hrmdemo.dto.project;

import java.time.LocalDate;
import java.util.List;

/**
 * A run of days on which one Employee's Tải phân bổ does not change.
 *
 * @param overloaded above 100% (Quá tải); exactly 100% is not
 */
public record LoadPeriodView(LocalDate from, LocalDate to, int totalPercent, boolean overloaded,
        List<LoadPart> parts) {
}
