package com.hrmdemo.controller.leave;

import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.dto.leave.LeaveCalendarResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.leave.LeaveCalendarService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Lịch nghỉ phép. No permission of its own: the caller's data scope decides whose leave is shown. */
@RestController
@RequiredArgsConstructor
public class LeaveCalendarController {

    private final LeaveCalendarService calendar;

    @GetMapping("/api/leave-calendar")
    @Operation(summary = "Who is off on which days in a range of at most 62 days (approved and waiting), "
            + "within the caller's data scope, optionally of one unit or one project")
    LeaveCalendarResponse calendar(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "A unit, with the units below it") @RequestParam(required = false) UUID orgUnitId,
            @Parameter(description = "People with an allocation on it during the request")
            @RequestParam(required = false) UUID projectId) {
        return calendar.calendar(caller, from, to, orgUnitId, projectId);
    }
}
