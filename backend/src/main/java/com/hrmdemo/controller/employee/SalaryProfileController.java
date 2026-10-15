package com.hrmdemo.controller.employee;

import com.hrmdemo.dto.employee.SalaryProfileSegment;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.SalaryProfileService;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/employees/{employeeId}/salary-profile")
@RequiredArgsConstructor
public class SalaryProfileController {
    private final SalaryProfileService service;

    @GetMapping
    public List<SalaryProfileSegment> period(CurrentAccount caller, @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.period(caller, employeeId, from, to);
    }
}
