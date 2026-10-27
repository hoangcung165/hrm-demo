package com.hrmdemo.controller.dashboard;

import com.hrmdemo.dto.dashboard.DashboardApprovalsResponse;
import com.hrmdemo.dto.dashboard.DashboardTilesResponse;
import com.hrmdemo.dto.dashboard.HeadcountResponse;
import com.hrmdemo.dto.dashboard.LeaveTodayResponse;
import com.hrmdemo.dto.dashboard.TeamResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.dashboard.DashboardApprovalService;
import com.hrmdemo.service.dashboard.DashboardHeadcountService;
import com.hrmdemo.service.dashboard.DashboardService;
import com.hrmdemo.service.dashboard.DashboardTeamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Tổng quan: one read per block of the page, each within the caller's data scope. */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboard;
    private final DashboardApprovalService approvals;
    private final DashboardHeadcountService headcount;
    private final DashboardTeamService team;

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

    @GetMapping("/approvals")
    @Operation(summary = "The first requests waiting for the caller, as the inbox's waiting tab orders them, with the "
            + "warnings that keep a request from being approved in one click")
    DashboardApprovalsResponse approvals(@Parameter(hidden = true) CurrentAccount caller,
            @Parameter(description = "How many to list, 1 to 20") @RequestParam(defaultValue = "5") int limit) {
        return approvals.waiting(caller, limit);
    }

    @GetMapping("/headcount")
    @Operation(summary = "Active Employees per unit and the joins and leaves of the last 6 months, within the "
            + "caller's data scope (needs EMPLOYEE_VIEW)")
    HeadcountResponse headcount(@Parameter(hidden = true) CurrentAccount caller) {
        return headcount.headcount(caller);
    }

    @GetMapping("/team")
    @Operation(summary = "The members of the units the caller heads, with this week's load and upcoming leave "
            + "(403 for an Account that heads no unit)")
    TeamResponse team(@Parameter(hidden = true) CurrentAccount caller) {
        return team.team(caller);
    }
}
