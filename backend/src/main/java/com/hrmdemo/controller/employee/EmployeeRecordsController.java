package com.hrmdemo.controller.employee;

import java.util.List;
import java.util.UUID;

import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.EmployeeRecordsService;
import com.hrmdemo.service.employee.EmployeeRecordsService.BankRequest;
import com.hrmdemo.service.employee.EmployeeRecordsService.BankView;
import com.hrmdemo.service.employee.EmployeeRecordsService.DependentRequest;
import com.hrmdemo.service.employee.EmployeeRecordsService.DependentView;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Employee bank accounts and tax dependents (HRM-08). All authorization is checked in the service. */
@RestController
@RequestMapping("/api/employees/{employeeId}")
@RequiredArgsConstructor
public class EmployeeRecordsController {
    private final EmployeeRecordsService records;

    @GetMapping("/bank-accounts")
    List<BankView> banks(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId) {
        return records.banks(caller, employeeId);
    }

    @PostMapping("/bank-accounts")
    @ResponseStatus(HttpStatus.CREATED)
    BankView addBank(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestBody BankRequest request) {
        return records.addBank(caller, employeeId, request);
    }

    @PutMapping("/bank-accounts/{id}")
    BankView editBank(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id, @RequestBody BankRequest request) {
        return records.editBank(caller, employeeId, id, request);
    }

    @DeleteMapping("/bank-accounts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteBank(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id) {
        records.deleteBank(caller, employeeId, id);
    }

    @GetMapping("/dependents")
    List<DependentView> dependents(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId) {
        return records.dependents(caller, employeeId);
    }

    @PostMapping("/dependents")
    @ResponseStatus(HttpStatus.CREATED)
    DependentView addDependent(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestBody DependentRequest request) {
        return records.addDependent(caller, employeeId, request);
    }

    @PutMapping("/dependents/{id}")
    DependentView editDependent(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id, @RequestBody DependentRequest request) {
        return records.editDependent(caller, employeeId, id, request);
    }

    @DeleteMapping("/dependents/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteDependent(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id) {
        records.deleteDependent(caller, employeeId, id);
    }
}
