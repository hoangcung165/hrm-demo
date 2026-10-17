package com.hrmdemo.controller.employee;

import com.hrmdemo.dto.employee.WorkDecisionRequest;
import com.hrmdemo.dto.employee.WorkHistoryItem;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.WorkHistoryService;
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
@RequestMapping("/api/employees/{employeeId}/work-history")
@RequiredArgsConstructor
public class WorkHistoryController {
    private final WorkHistoryService history;

    @GetMapping
    List<WorkHistoryItem> list(CurrentAccount caller, @PathVariable UUID employeeId) {
        return history.list(caller, employeeId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    WorkHistoryItem create(CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestBody WorkDecisionRequest request) {
        return history.create(caller, employeeId, request);
    }
}
