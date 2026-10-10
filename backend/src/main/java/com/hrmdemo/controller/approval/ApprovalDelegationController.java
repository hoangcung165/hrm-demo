package com.hrmdemo.controller.approval;

import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.approval.ApprovalDelegationRequest;
import com.hrmdemo.dto.approval.ApprovalDelegationResponse;
import com.hrmdemo.dto.approval.ApprovalDelegationsResponse;
import com.hrmdemo.dto.employee.EmployeeCard;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.approval.ApprovalDelegationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Ủy quyền duyệt of the caller (tab "Ủy quyền duyệt" of the inbox). Any Account linked to an Employee. */
@RestController
@RequestMapping("/api/approval-delegations")
@RequiredArgsConstructor
public class ApprovalDelegationController {

    private final ApprovalDelegationService delegations;

    @GetMapping
    @Operation(summary = "The caller's delegations to others and from others")
    ApprovalDelegationsResponse list(@Parameter(hidden = true) CurrentAccount caller) {
        return delegations.list(caller);
    }

    @GetMapping("/candidates")
    @Operation(summary = "Active Employees the caller may delegate to, by name or code (at most 20)")
    List<EmployeeCard> candidates(@Parameter(hidden = true) CurrentAccount caller,
            @Parameter(description = "Part of the full name or the employee code; case and accents do not matter")
            @RequestParam(required = false) String q) {
        return delegations.candidates(caller, q);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Delegate the caller's approvals of some request types for a range of days")
    ApprovalDelegationResponse create(@Parameter(hidden = true) CurrentAccount caller,
            @Valid @RequestBody ApprovalDelegationRequest request) {
        return delegations.create(caller, request);
    }

    @PostMapping("/{id}/end")
    @Operation(summary = "Kết thúc sớm: stop a delegation in force now")
    ApprovalDelegationResponse end(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return delegations.endEarly(caller, id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Hủy ủy quyền: remove a delegation that has not started")
    void cancel(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        delegations.cancel(caller, id);
    }
}
