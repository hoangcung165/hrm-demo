package com.hrmdemo.dto.resource;

/**
 * New Ngưỡng nguồn lực. Every field is checked by the service, which reports all failing fields at once.
 *
 * @param benchPercent    1 to 99; Tải phân bổ below it is Bench; below {@code nearFullPercent}
 * @param nearFullPercent 2 to 100; from it up to 100 the heatmap cell is drawn dark
 * @param endingWeeks     1 to 12; an allocation ending within this many weeks is Sắp hết dự án
 */
public record ResourceSettingsRequest(Integer benchPercent, Integer nearFullPercent, Integer endingWeeks) {
}
