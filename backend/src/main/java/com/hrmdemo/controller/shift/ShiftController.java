package com.hrmdemo.controller.shift;

import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.shift.ShiftRequest;
import com.hrmdemo.dto.shift.ShiftResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.shift.ShiftService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
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

/** Ca làm việc. Reading needs SHIFT_VIEW; adding, changing, turning on and off needs SHIFT_EDIT. Never deleted. */
@RestController
@RequestMapping("/api/shifts")
@RequiredArgsConstructor
public class ShiftController {

    private final ShiftService shifts;

    @GetMapping
    @Operation(summary = "The shifts, earliest start first; active=true or false limits them")
    List<ShiftResponse> list(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(required = false) Boolean active) {
        return shifts.list(caller, active);
    }

    @GetMapping("/{id}")
    @Operation(summary = "One shift")
    ShiftResponse get(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return shifts.get(caller, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a shift")
    ShiftResponse create(@Parameter(hidden = true) CurrentAccount caller, @RequestBody ShiftRequest request) {
        return shifts.create(caller, request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Change a shift (its code stays)")
    ShiftResponse update(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @RequestBody ShiftRequest request) {
        return shifts.update(caller, id, request);
    }

    @PostMapping("/{id}/deactivate")
    @Operation(summary = "Turn a shift off: it takes no new assignments")
    ShiftResponse deactivate(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return shifts.deactivate(caller, id);
    }

    @PostMapping("/{id}/reactivate")
    @Operation(summary = "Turn a shift back on")
    ShiftResponse reactivate(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return shifts.reactivate(caller, id);
    }
}
