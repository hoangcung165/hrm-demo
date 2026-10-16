package com.hrmdemo.controller.leave;

import java.util.UUID;

import com.hrmdemo.dto.leave.LeavePolicyValues;
import com.hrmdemo.dto.leave.LeaveTypeCreateRequest;
import com.hrmdemo.dto.leave.LeaveTypeResponse;
import com.hrmdemo.dto.leave.LeaveTypeUpdateRequest;
import com.hrmdemo.dto.leave.LeaveTypesResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.leave.LeavePolicyService;
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

/**
 * Loại nghỉ and their Chính sách phép. Everyone lists the active types with today's policy (the request form);
 * {@code all=true}, adding, changing and saving a policy need LEAVE_POLICY_EDIT. Types are never deleted.
 */
@RestController
@RequestMapping("/api/leave-types")
@RequiredArgsConstructor
public class LeaveTypeController {

    private final LeavePolicyService policies;

    @GetMapping
    @Operation(summary = "The active types with today's policy; with all=true every type and every policy version")
    LeaveTypesResponse list(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(defaultValue = "false") boolean all) {
        return all ? policies.all(caller) : policies.active(caller);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a type with its first policy")
    LeaveTypeResponse create(@Parameter(hidden = true) CurrentAccount caller,
            @RequestBody LeaveTypeCreateRequest request) {
        return policies.create(caller, request);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Rename a type, move it in the lists, or turn it on or off")
    LeaveTypeResponse update(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @RequestBody LeaveTypeUpdateRequest request) {
        return policies.update(caller, id, request);
    }

    @PutMapping("/{id}/policy")
    @Operation(summary = "Save a policy version from its effective date (replaces the version of that date)")
    LeaveTypeResponse savePolicy(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @RequestBody LeavePolicyValues request) {
        return policies.savePolicy(caller, id, request);
    }
}
