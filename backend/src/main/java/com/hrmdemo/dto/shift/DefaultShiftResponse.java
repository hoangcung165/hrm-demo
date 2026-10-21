package com.hrmdemo.dto.shift;

import java.util.UUID;

/** The Ca mặc định of an Đơn vị tổ chức after a change; {@code defaultShiftId} is null when it has none. */
public record DefaultShiftResponse(UUID orgUnitId, UUID defaultShiftId) {
}
