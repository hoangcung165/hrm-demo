package com.hrmdemo.controller.employee;

import com.hrmdemo.dto.employee.ResignationRequest;
import com.hrmdemo.dto.employee.WorkHistoryItem;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.ResignationService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/employees/{employeeId}/resignation")
@RequiredArgsConstructor
public class ResignationController {
    private final ResignationService resignations;

    @GetMapping
    WorkHistoryItem get(CurrentAccount caller, @PathVariable UUID employeeId) {
        return resignations.get(caller, employeeId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    WorkHistoryItem create(CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestBody ResignationRequest request) {
        return resignations.create(caller, employeeId, request);
    }
}
