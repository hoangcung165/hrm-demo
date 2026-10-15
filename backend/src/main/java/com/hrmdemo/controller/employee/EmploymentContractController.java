package com.hrmdemo.controller.employee;

import com.hrmdemo.dto.employee.ContractAmendmentRequest;
import com.hrmdemo.dto.employee.EmploymentContractRequest;
import com.hrmdemo.dto.employee.ContractAmendmentResponse;
import com.hrmdemo.dto.employee.EmploymentContractResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.EmploymentContractService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/employees/{employeeId}/contracts")
@RequiredArgsConstructor
public class EmploymentContractController {
    private final EmploymentContractService service;

    @GetMapping
    public List<EmploymentContractResponse> list(CurrentAccount caller, @PathVariable UUID employeeId) {
        return service.list(caller, employeeId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EmploymentContractResponse create(CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestBody EmploymentContractRequest request) {
        return service.create(caller, employeeId, request);
    }

    @PutMapping("/{id}")
    public EmploymentContractResponse update(CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id, @RequestBody EmploymentContractRequest request) {
        return service.update(caller, employeeId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(CurrentAccount caller, @PathVariable UUID employeeId, @PathVariable UUID id) {
        service.delete(caller, employeeId, id);
    }

    @GetMapping("/{id}/amendments")
    public List<ContractAmendmentResponse> amendments(CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id) {
        return service.amendments(caller, employeeId, id);
    }

    @PostMapping("/{id}/amendments")
    @ResponseStatus(HttpStatus.CREATED)
    public ContractAmendmentResponse addAmendment(CurrentAccount caller, @PathVariable UUID employeeId,
            @PathVariable UUID id, @RequestBody ContractAmendmentRequest request) {
        return service.addAmendment(caller, employeeId, id, request);
    }
}
