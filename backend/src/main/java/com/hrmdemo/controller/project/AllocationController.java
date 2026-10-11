package com.hrmdemo.controller.project;

import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.project.AllocationCandidate;
import com.hrmdemo.dto.project.AllocationEndRequest;
import com.hrmdemo.dto.project.AllocationListResponse;
import com.hrmdemo.dto.project.AllocationRequest;
import com.hrmdemo.dto.project.AllocationSaveResponse;
import com.hrmdemo.dto.project.AllocationUpdateRequest;
import com.hrmdemo.dto.project.TryAllocationRequest;
import com.hrmdemo.dto.project.TryAllocationResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.project.AllocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
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
 * Phân bổ of a Dự án (HRM-15). Reading needs PROJECT_VIEW; the rest needs the right to edit the project
 * (PROJECT_EDIT_ALL, or PROJECT_EDIT as its PM), and changes need a project that is not closed. Saving an allocation
 * that overloads someone succeeds; the response's {@code check} says so.
 */
@RestController
@RequestMapping("/api/projects/{projectId}")
@RequiredArgsConstructor
public class AllocationController {

    private final AllocationService allocationService;

    @GetMapping("/allocations")
    @Operation(summary = "Running and upcoming allocations, or the ended ones, with each one's peak load; "
            + "needs PROJECT_VIEW")
    AllocationListResponse list(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID projectId,
            @Parameter(description = "true: the ended allocations") @RequestParam(defaultValue = "false")
            boolean ended) {
        return allocationService.list(caller, projectId, ended);
    }

    @GetMapping("/allocation-candidates")
    @Operation(summary = "Active Employees to allocate, by name or code, at most 20, with their load today")
    List<AllocationCandidate> candidates(@Parameter(hidden = true) CurrentAccount caller,
            @PathVariable UUID projectId, @RequestParam(required = false) String q) {
        return allocationService.candidates(caller, projectId, q);
    }

    @PostMapping("/allocations/try")
    @Operation(summary = "Thử phân bổ: the Employee's load if the allocation were saved; nothing is saved")
    TryAllocationResponse tryAllocation(@Parameter(hidden = true) CurrentAccount caller,
            @PathVariable UUID projectId, @RequestBody TryAllocationRequest request) {
        return allocationService.tryAllocation(caller, projectId, request);
    }

    @PostMapping("/allocations")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Allocate an Employee; an overload is reported in check, not refused")
    AllocationSaveResponse create(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID projectId,
            @RequestBody AllocationRequest request) {
        return allocationService.create(caller, projectId, request);
    }

    @PutMapping("/allocations/{id}")
    @Operation(summary = "Replace role, percent and dates; the Employee never changes")
    AllocationSaveResponse update(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID projectId,
            @PathVariable UUID id, @RequestBody AllocationUpdateRequest request) {
        return allocationService.update(caller, projectId, id, request);
    }

    @PostMapping("/allocations/{id}/end")
    @Operation(summary = "Kết thúc sớm: move the last day earlier")
    AllocationSaveResponse endEarly(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID projectId,
            @PathVariable UUID id, @RequestBody AllocationEndRequest request) {
        return allocationService.endEarly(caller, projectId, id, request);
    }

    @DeleteMapping("/allocations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete an allocation that has not started yet")
    void delete(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID projectId,
            @PathVariable UUID id) {
        allocationService.delete(caller, projectId, id);
    }
}
