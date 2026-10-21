package com.hrmdemo.controller.shift;

import java.util.UUID;

import com.hrmdemo.dto.shift.DefaultShiftRequest;
import com.hrmdemo.dto.shift.DefaultShiftResponse;
import com.hrmdemo.dto.shift.ShiftAssignRequest;
import com.hrmdemo.dto.shift.ShiftAssignResult;
import com.hrmdemo.dto.shift.ShiftClearRequest;
import com.hrmdemo.dto.shift.ShiftClearResult;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.shift.ShiftAssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Phân ca and the Ca mặc định of an Đơn vị tổ chức. Everything needs SHIFT_ASSIGN within the data scope. */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ShiftAssignmentController {

    private final ShiftAssignmentService assignments;

    @PutMapping("/shift-assignments")
    @Operation(summary = "Assign a shift to people or a unit for a range of days, replacing what is there")
    ShiftAssignResult assign(@Parameter(hidden = true) CurrentAccount caller,
            @RequestBody ShiftAssignRequest request) {
        return assignments.assign(caller, request);
    }

    @DeleteMapping("/shift-assignments")
    @Operation(summary = "Clear the shift assignments of people or a unit for a range of days")
    ShiftClearResult clear(@Parameter(hidden = true) CurrentAccount caller, @RequestBody ShiftClearRequest request) {
        return assignments.clear(caller, request);
    }

    @PutMapping("/org-units/{id}/default-shift")
    @Operation(summary = "Set or clear the default shift of a unit")
    DefaultShiftResponse setDefault(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @RequestBody DefaultShiftRequest request) {
        return assignments.setDefault(caller, id, request);
    }
}
