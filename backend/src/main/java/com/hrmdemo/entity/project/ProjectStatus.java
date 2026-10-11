package com.hrmdemo.entity.project;

/** Trạng thái of a Dự án. Only a closed project takes no new Phân bổ (HRM-15, BE-3). */
public enum ProjectStatus {
    /** Lên kế hoạch. */
    PLANNED,
    /** Đang chạy. */
    ACTIVE,
    /** Tạm dừng. */
    ON_HOLD,
    /** Đã đóng. */
    CLOSED
}
