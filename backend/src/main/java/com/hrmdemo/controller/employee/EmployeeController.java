package com.hrmdemo.controller.employee;

import java.util.UUID;

import com.hrmdemo.dto.employee.DefaultManagerResponse;
import com.hrmdemo.dto.employee.EmployeeCreateRequest;
import com.hrmdemo.dto.employee.EmployeeResponse;
import com.hrmdemo.dto.employee.NextEmployeeCodeResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.EmployeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Nhân viên (Employees). Profiles need EMPLOYEE_VIEW within the data scope, except one's own; adding needs
 * EMPLOYEE_EDIT. The identity numbers come back masked without EMPLOYEE_SENSITIVE_VIEW.
 */
@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

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
