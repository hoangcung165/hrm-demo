package com.hrmdemo.controller.employee;

import com.hrmdemo.dto.employee.ExpiryType;
import com.hrmdemo.dto.employee.ExpiryPolicyRequest;
import com.hrmdemo.dto.employee.ExpiryPolicyResponse;
import com.hrmdemo.dto.employee.UpcomingExpiriesResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.ExpiryPolicyService;
import com.hrmdemo.service.employee.UpcomingExpiryService;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/expiry")
@RequiredArgsConstructor
public class ExpiryController {
    private final ExpiryPolicyService policies;
    private final UpcomingExpiryService expiries;

    @GetMapping("/settings")
    ExpiryPolicyResponse settings(CurrentAccount caller) { return policies.get(caller); }

    @PutMapping("/settings")
    ExpiryPolicyResponse update(CurrentAccount caller, @RequestBody ExpiryPolicyRequest request) {
        return policies.update(caller, request);
    }

    /** Filters narrow the per-type warning windows; expired items are excluded. */
    @GetMapping
    UpcomingExpiriesResponse list(CurrentAccount caller, @RequestParam(required = false) ExpiryType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return expiries.list(caller, type, from, to, page, size);
    }
}
