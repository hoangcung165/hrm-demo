package com.hrmdemo.dto.shift;

import java.util.UUID;

/** The Ca mặc định of an Đơn vị tổ chức: an active shift, or null to clear it. */
public record DefaultShiftRequest(UUID shiftId) {
}
