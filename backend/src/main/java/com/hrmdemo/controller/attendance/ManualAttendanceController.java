package com.hrmdemo.controller.attendance;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.attendance.ManualAttendanceClearRequest;
import com.hrmdemo.dto.attendance.ManualAttendanceClearResult;
import com.hrmdemo.dto.attendance.ManualAttendanceRequest;
import com.hrmdemo.dto.attendance.ManualAttendanceResponse;
import com.hrmdemo.dto.attendance.ManualAttendanceSaveResult;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.attendance.ManualAttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Công thủ công (HRM-24). Everything needs ATTENDANCE_MANUAL and works within the data scope. */
@RestController
@RequestMapping("/api/attendance/manual")
@RequiredArgsConstructor
public class ManualAttendanceController {

    private final ManualAttendanceService manual;

    @GetMapping
    @Operation(summary = "The Công thủ công and the days with a shift of a unit (with the units below it) or of the "
            + "people given, for a range of at most 62 days")
    ManualAttendanceResponse list(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(required = false) List<UUID> employeeIds, @RequestParam(required = false) UUID orgUnitId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return manual.list(caller, employeeIds, orgUnitId, from, to);
    }

    @PutMapping
    @Operation(summary = "Enter the same Công thủ công for people on a range of days, replacing what is there; days "
            + "without a shift are skipped and reported")
    ManualAttendanceSaveResult save(@Parameter(hidden = true) CurrentAccount caller,
            @RequestBody ManualAttendanceRequest request) {
        return manual.save(caller, request);
    }

    @DeleteMapping
    @Operation(summary = "Clear the Công thủ công of people or a unit for a range of days")
    ManualAttendanceClearResult clear(@Parameter(hidden = true) CurrentAccount caller,
            @RequestBody ManualAttendanceClearRequest request) {
        return manual.clear(caller, request);
    }
}
