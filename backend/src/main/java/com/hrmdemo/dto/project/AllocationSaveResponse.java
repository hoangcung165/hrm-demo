package com.hrmdemo.dto.project;

/**
 * A saved Phân bổ and its Tải phân bổ check: an overload is reported here, not refused (the PM may save anyway).
 */
public record AllocationSaveResponse(AllocationResponse allocation, TryAllocationResponse check) {
}
