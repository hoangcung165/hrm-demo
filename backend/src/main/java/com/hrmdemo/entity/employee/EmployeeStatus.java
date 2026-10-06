package com.hrmdemo.entity.employee;

/** Trạng thái nhân viên. Everything but {@link #INACTIVE} counts as active. */
public enum EmployeeStatus {
    /** Thử việc. */
    PROBATION,
    /** Chính thức. */
    OFFICIAL,
    /** Đã nghỉ việc: set only by the resignation flow (HRM-11), never by create or edit. */
    INACTIVE;

    public boolean isActive() {
        return this != INACTIVE;
    }
}
