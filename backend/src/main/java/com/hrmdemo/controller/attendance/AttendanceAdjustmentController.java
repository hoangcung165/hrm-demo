package com.hrmdemo.controller.attendance;

import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.attendance.AttendanceAdjustmentCheck;
import com.hrmdemo.dto.attendance.AttendanceAdjustmentListItem;
import com.hrmdemo.dto.attendance.AttendanceAdjustmentPayload;
import com.hrmdemo.dto.attendance.AttendanceAdjustmentResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.attendance.AttendanceAdjustmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Đơn bổ sung công (HRM-24): an Employee's request for a punch time they forgot, through the Luồng phê duyệt
 * "Bổ sung công". Needs an Account linked to an Employee; approving goes through {@code /api/approvals}.
 */
@RestController
@RequestMapping("/api/attendance/adjustments")
@RequiredArgsConstructor
public class AttendanceAdjustmentController {

    private final AttendanceAdjustmentService adjustments;

    @GetMapping("/check")
    @Operation(summary = "One of the caller's days as the form needs it: the day now, the missing side(s), who "
            + "approves, and what stops a request")
    AttendanceAdjustmentCheck check(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return adjustments.check(caller, date);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Send a Đơn bổ sung công for one of the caller's days")
    AttendanceAdjustmentResponse submit(@Parameter(hidden = true) CurrentAccount caller,
            @RequestBody AttendanceAdjustmentPayload payload) {
        return adjustments.submit(caller, payload);
    }

    @GetMapping
    @Operation(summary = "The caller's Đơn bổ sung công, latest first")
    PageResponse<AttendanceAdjustmentListItem> mine(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return adjustments.mine(caller, page, size);
    }

    @GetMapping("/{id}")
    @Operation(summary = "One Đơn bổ sung công with the day now and after approval, for its sender and approvers")
    AttendanceAdjustmentResponse get(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return adjustments.get(caller, id);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Edit and send again a request returned to its sender")
    AttendanceAdjustmentResponse resubmit(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @RequestBody AttendanceAdjustmentPayload payload) {
        return adjustments.resubmit(caller, id, payload);
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel a request that waits or was returned")
    AttendanceAdjustmentResponse cancel(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return adjustments.cancel(caller, id);
    }
}
