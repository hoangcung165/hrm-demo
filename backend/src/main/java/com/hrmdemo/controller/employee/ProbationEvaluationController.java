package com.hrmdemo.controller.employee;

import com.hrmdemo.dto.employee.ProbationEvaluationRequest;
import com.hrmdemo.dto.employee.ProbationEvaluationResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.ProbationEvaluationService;
import java.util.List;
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
@RequestMapping("/api/employees/{employeeId}/probation-evaluations")
@RequiredArgsConstructor
public class ProbationEvaluationController {
    private final ProbationEvaluationService evaluations;

    @GetMapping
    public List<ProbationEvaluationResponse> list(CurrentAccount caller, @PathVariable UUID employeeId) {
        return evaluations.list(caller, employeeId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProbationEvaluationResponse create(CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestBody ProbationEvaluationRequest request) {
        return evaluations.create(caller, employeeId, request);
    }
}
