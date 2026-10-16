package com.hrmdemo.dto.workschedule;

import java.time.DayOfWeek;
import java.time.Instant;
import java.util.Map;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The Lịch làm việc of the company: what each weekday is.
 *
 * @param custom    the company saved its own; false while it follows the default (Monday to Friday)
 * @param canEdit   the caller may change it ({@code COMPANY_EDIT})
 * @param updatedAt when the company's own was saved; null for the default
 */
public record WorkScheduleResponse(Map<DayOfWeek, WorkDayKind> days, boolean custom, boolean canEdit,
        @Schema(nullable = true) Instant updatedAt) {
}
