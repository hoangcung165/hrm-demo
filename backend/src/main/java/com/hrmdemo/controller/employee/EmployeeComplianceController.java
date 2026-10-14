package com.hrmdemo.controller.employee;

import java.util.List;
import java.util.UUID;

import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.EmployeeComplianceService;
import com.hrmdemo.service.employee.EmployeeComplianceService.DocumentRequest;
import com.hrmdemo.service.employee.EmployeeComplianceService.DocumentView;
import com.hrmdemo.service.employee.EmployeeComplianceService.InsuranceRequest;
import com.hrmdemo.service.employee.EmployeeComplianceService.InsuranceView;
import com.hrmdemo.service.employee.EmployeeComplianceService.NationalityRequest;
import com.hrmdemo.service.employee.EmployeeComplianceService.NationalityView;
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

/** Insurance, nationality and travel/work document metadata for HRM-08. */
@RestController
@RequestMapping("/api/employees/{employeeId}")
@RequiredArgsConstructor
public class EmployeeComplianceController {
    private final EmployeeComplianceService service;

    @GetMapping("/insurance")
    InsuranceView insurance(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId) {
        return service.insurance(caller, employeeId);
    }

    @PutMapping("/insurance")
    InsuranceView saveInsurance(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestBody InsuranceRequest request) {
        return service.saveInsurance(caller, employeeId, request);
    }

    @GetMapping("/nationality")
    NationalityView nationality(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId) {
        return service.nationality(caller, employeeId);
    }

    @PutMapping("/nationality")
    NationalityView saveNationality(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestBody NationalityRequest request) {
        return service.saveNationality(caller, employeeId, request);
    }

    @GetMapping("/expat-documents")
    List<DocumentView> documents(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId) {
        return service.documents(caller, employeeId);
    }

    @PostMapping("/expat-documents")
    @ResponseStatus(HttpStatus.CREATED)
    DocumentView addDocument(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestBody DocumentRequest request) {
        return service.addDocument(caller, employeeId, request);
    }

    @PutMapping("/expat-documents/{id}")
    DocumentView updateDocument(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id, @RequestBody DocumentRequest request) {
        return service.updateDocument(caller, employeeId, id, request);
    }

    @DeleteMapping("/expat-documents/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteDocument(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id) {
        service.deleteDocument(caller, employeeId, id);
    }
}
