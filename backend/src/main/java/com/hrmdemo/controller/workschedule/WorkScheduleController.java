package com.hrmdemo.controller.workschedule;

import com.hrmdemo.dto.workschedule.WorkScheduleRequest;
import com.hrmdemo.dto.workschedule.WorkScheduleResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.workschedule.WorkScheduleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Lịch làm việc of the company: read by everyone, changed with COMPANY_EDIT. */
@RestController
@RequestMapping("/api/work-schedule")
@RequiredArgsConstructor
public class WorkScheduleController {

    private final WorkScheduleService workSchedule;

    @GetMapping
    @Operation(summary = "What each weekday is: a full working day, a morning only, or a day off")
    WorkScheduleResponse get(@Parameter(hidden = true) CurrentAccount caller) {
        return workSchedule.get(caller);
    }

    @PutMapping
    @Operation(summary = "Change the Lịch làm việc; saving the default (Monday to Friday) removes the company's own")
    WorkScheduleResponse update(@Parameter(hidden = true) CurrentAccount caller,
            @RequestBody WorkScheduleRequest request) {
        return workSchedule.update(caller, request);
    }
}
