package com.hrmdemo.controller.employee;

import com.hrmdemo.dto.employee.ContractListResponse;
import com.hrmdemo.dto.employee.ContractState;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.employee.ContractListService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/contracts")
@RequiredArgsConstructor
public class ContractListController {
    private final ContractListService service;

    /** The company's contracts: filters combine; `search` matches Employee name or code, or the contract number. */
    @GetMapping
    ContractListResponse list(CurrentAccount caller, @RequestParam(required = false) String search,
            @RequestParam(required = false) String type, @RequestParam(required = false) ContractState state,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return service.list(caller, search, type, state, page, size);
    }
}
