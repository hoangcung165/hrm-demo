package com.hrmdemo.controller.attendance;

import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.dto.attendance.DailyAttendanceResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.attendance.DailyAttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Công theo ngày (HRM-23): the processed attendance of the Employees the caller may see. */
@RestController
@RequestMapping("/api/attendance/daily")
@RequiredArgsConstructor
public class DailyAttendanceController {

    private final DailyAttendanceService service;

    @GetMapping
    @Operation(summary = "Daily attendance per Employee for at most 62 days, computed from the stored punches, "
            + "effective shifts, holidays and approved leave, paged by Employee. With ATTENDANCE_VIEW the caller sees "
            + "their data scope, without it only their own days. Days the log does not cover are noLog, not absent")
    DailyAttendanceResponse daily(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID orgUnitId,
            @RequestParam(required = false) UUID employeeId,
            @Parameter(description = "Search on name or code, accents ignored") @RequestParam(required = false) String q,
            @Parameter(description = "Keep only days that are late, early leave, missing a punch or absent")
            @RequestParam(defaultValue = "false") boolean abnormalOnly,
            @Parameter(description = "abnormal (most abnormal days first, default) or name")
            @RequestParam(defaultValue = DailyAttendanceService.SORT_ABNORMAL) String sort,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.daily(caller, from, to, orgUnitId, employeeId, q, abnormalOnly, sort, page, size);
    }
}
