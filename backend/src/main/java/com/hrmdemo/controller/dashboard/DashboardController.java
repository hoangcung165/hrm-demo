package com.hrmdemo.controller.dashboard;

import com.hrmdemo.dto.dashboard.DashboardTilesResponse;
import com.hrmdemo.dto.dashboard.LeaveTodayResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.dashboard.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Tổng quan: one read per block of the page, each within the caller's data scope. */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboard;

    @GetMapping("/tiles")
    @Operation(summary = "Headcount, people in probation, on leave today and working today, within the caller's "
            + "data scope (needs EMPLOYEE_VIEW)")
    DashboardTilesResponse tiles(@Parameter(hidden = true) CurrentAccount caller) {
        return dashboard.tiles(caller);
    }

    @GetMapping("/leave-today")
    @Operation(summary = "Who is on approved leave today, within the caller's data scope")
    LeaveTodayResponse leaveToday(@Parameter(hidden = true) CurrentAccount caller) {
        return dashboard.leaveToday(caller);
    }
}
