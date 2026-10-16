package com.hrmdemo.service.leave;

import java.time.LocalDate;

import com.hrmdemo.dto.leave.DayPart;

/** The days a Đơn nghỉ asks for: from a day (whole, or from the afternoon) to a day (whole, or until noon). */
public record LeaveSpan(LocalDate start, DayPart startPart, LocalDate end, DayPart endPart) {
}
