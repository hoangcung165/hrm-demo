package com.hrmdemo.dto.leave;

/**
 * Which part of a day a Đơn nghỉ takes. One day: the whole day, the morning or the afternoon. Several days: the first
 * day the whole day or from the afternoon, the last day the whole day or until noon, every day between whole.
 */
public enum DayPart {
    FULL,
    MORNING,
    AFTERNOON
}
