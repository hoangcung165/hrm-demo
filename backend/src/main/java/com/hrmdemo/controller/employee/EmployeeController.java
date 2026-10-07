package com.hrmdemo.controller.employee;

import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.employee.DefaultManagerResponse;
import com.hrmdemo.dto.employee.EmployeeCreateRequest;
import com.hrmdemo.dto.employee.EmployeeIdentityRequest;
import com.hrmdemo.dto.employee.EmployeeJobRequest;
import com.hrmdemo.dto.employee.EmployeeListItem;
import com.hrmdemo.dto.employee.EmployeeListQuery;
import com.hrmdemo.dto.employee.EmployeeOption;
import com.hrmdemo.dto.employee.EmployeeOptionsQuery;
import com.hrmdemo.dto.employee.EmployeePersonalUpdateRequest;
import com.hrmdemo.dto.employee.EmployeeResponse;
import com.hrmdemo.dto.employee.NextEmployeeCodeResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.EmployeeListService;
import com.hrmdemo.service.employee.EmployeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
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
 * Nhân viên (Employees). Profiles need EMPLOYEE_VIEW within the data scope, except one's own; adding needs
 * EMPLOYEE_EDIT, editing needs it within the data scope (the identity numbers also EMPLOYEE_SENSITIVE_VIEW).
 * The identity numbers come back masked without EMPLOYEE_SENSITIVE_VIEW.
 */
@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeListService employeeListService;

    @GetMapping
    @Operation(summary = "One page of the Employees within the data scope; needs EMPLOYEE_VIEW")
    PageResponse<EmployeeListItem> list(
            @Parameter(hidden = true) CurrentAccount caller,
            @Parameter(description = "Page number, from 0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Rows per page, 1 to 100") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Part of the full name or the employee code; case and accents do not matter")
            @RequestParam(required = false) String q,
            @Parameter(description = "One unit") @RequestParam(required = false) UUID orgUnitId,
            @Parameter(description = "With orgUnitId: also every unit below it, inactive ones included")
            @RequestParam(defaultValue = "true") boolean includeSubUnits,
            @Parameter(description = "One Chức danh") @RequestParam(required = false) UUID positionId,
            @Parameter(description = "Comma-separated PROBATION, OFFICIAL, INACTIVE; empty means all")
            @RequestParam(required = false) String status,
            @Parameter(description = "code (default), fullName or hireDate, optionally with ,asc or ,desc",
                    schema = @Schema(example = "fullName,asc"))
            @RequestParam(required = false) String sort) {
        return employeeListService.list(caller,
                new EmployeeListQuery(page, size, q, orgUnitId, includeSubUnits, positionId, status, sort));
    }

    @GetMapping("/options")
    @Operation(summary = "Employees to pick from, by name, whole company; needs EMPLOYEE_VIEW, ORG_EDIT or ACCOUNT_EDIT")
    PageResponse<EmployeeOption> options(
            @Parameter(hidden = true) CurrentAccount caller,
            @Parameter(description = "Page number, from 0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Rows per page, 1 to 50") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Part of the full name or the employee code; case and accents do not matter")
            @RequestParam(required = false) String q,
            @Parameter(description = "One unit") @RequestParam(required = false) UUID orgUnitId,
            @Parameter(description = "With orgUnitId: also every unit below it")
            @RequestParam(defaultValue = "true") boolean includeSubUnits,
            @Parameter(description = "Comma-separated statuses; empty means PROBATION,OFFICIAL")
            @RequestParam(required = false) String status,
            @Parameter(description = "An Employee to leave out, e.g. the one being edited")
            @RequestParam(required = false) UUID excludeId) {
        return employeeListService.options(caller,
                new EmployeeOptionsQuery(page, size, q, orgUnitId, includeSubUnits, status, excludeId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add an Employee; the server issues the next employee code; needs EMPLOYEE_EDIT")
    EmployeeResponse create(@Parameter(hidden = true) CurrentAccount caller,
            @RequestBody EmployeeCreateRequest request) {
        return employeeService.create(caller, request);
    }

    @GetMapping("/{id}")
    @Operation(summary = "One profile: one's own, or one within the data scope with EMPLOYEE_VIEW")
    EmployeeResponse get(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return employeeService.get(caller, id);
    }

    @PutMapping("/{id}/personal")
    @Operation(summary = "Replace the full name and the personal fields; needs EMPLOYEE_EDIT within the data scope")
    EmployeeResponse editPersonal(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @RequestBody EmployeePersonalUpdateRequest request) {
        return employeeService.editPersonal(caller, id, request);
    }

    @PutMapping("/{id}/identity")
    @Operation(summary = "Replace CCCD (with issue date and place), MST and BHXH number; "
            + "needs EMPLOYEE_EDIT and EMPLOYEE_SENSITIVE_VIEW within the data scope")
    EmployeeResponse editIdentity(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @RequestBody EmployeeIdentityRequest request) {
        return employeeService.editIdentity(caller, id, request);
    }

    @PutMapping("/{id}/job")
    @Operation(summary = "Replace unit, position, manager, hire date and status (PROBATION or OFFICIAL); "
            + "needs EMPLOYEE_EDIT within the data scope")
    EmployeeResponse editJob(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @RequestBody EmployeeJobRequest request) {
        return employeeService.editJob(caller, id, request);
    }

    @GetMapping("/default-manager")
    @Operation(summary = "What \"follow the unit head\" resolves to for an Employee of the unit; needs EMPLOYEE_EDIT")
    DefaultManagerResponse defaultManager(@Parameter(hidden = true) CurrentAccount caller,
            @Parameter(description = "Empty: directly under the company") @RequestParam(required = false)
            UUID orgUnitId,
            @Parameter(description = "The Employee being edited; empty on create") @RequestParam(required = false)
            UUID employeeId) {
        return employeeService.defaultManager(caller, orgUnitId, employeeId);
    }

    @GetMapping("/next-code")
    @Operation(summary = "The employee code the next new Employee would get (a preview); needs EMPLOYEE_EDIT")
    NextEmployeeCodeResponse nextCode(@Parameter(hidden = true) CurrentAccount caller) {
        return employeeService.nextCode(caller);
    }
}
