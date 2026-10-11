package com.hrmdemo.dto.project;

import java.util.List;

/**
 * The Phân bổ of a project on one tab.
 *
 * @param items        running and upcoming ones by start day, or ended ones by end day, latest first
 * @param currentCount running and upcoming allocations ("Thành viên" tab)
 * @param endedCount   ended allocations ("Phân bổ đã kết thúc" tab)
 */
public record AllocationListResponse(List<AllocationResponse> items, int currentCount, int endedCount) {
}
