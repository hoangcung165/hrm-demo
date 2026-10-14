package com.hrmdemo.controller.project;

import java.util.UUID;

import com.hrmdemo.dto.project.EmployeeProjectsResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.project.EmployeeProjectsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The "Dự án" tab of an Employee's profile. */
@RestController
@RequestMapping("/api/employees/{employeeId}/projects")
@RequiredArgsConstructor
public class EmployeeProjectsController {

    private final EmployeeProjectsService service;

    @GetMapping
    @Operation(summary = "An Employee's allocations on all projects, newest first, and their load over 12 weeks; "
            + "one's own, or another's with EMPLOYEE_VIEW in scope and PROJECT_VIEW")
    EmployeeProjectsResponse get(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId) {
        return service.get(caller, employeeId);
    }
}
