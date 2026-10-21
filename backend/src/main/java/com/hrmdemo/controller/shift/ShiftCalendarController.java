package com.hrmdemo.controller.shift;

import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.dto.shift.ShiftCalendarResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.shift.ShiftCalendarService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Lịch ca. The data scope decides whose shifts are shown; without SHIFT_VIEW only the caller's own. */
@RestController
@RequiredArgsConstructor
public class ShiftCalendarController {

    private final ShiftCalendarService calendar;

    @GetMapping("/api/shift-calendar")
    @Operation(summary = "The effective shift of each Employee per day for a range of at most 62 days, paged by "
            + "Employee: the Phân ca, else the Ca mặc định of the unit on working days")
    ShiftCalendarResponse calendar(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "A unit, with the units below it") @RequestParam(required = false) UUID orgUnitId,
            @RequestParam(required = false) UUID employeeId,
            @Parameter(description = "Only Employees who work this shift in the range, and only its days")
            @RequestParam(required = false) UUID shiftId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        return calendar.calendar(caller, from, to, orgUnitId, employeeId, shiftId, page, size);
    }
}
