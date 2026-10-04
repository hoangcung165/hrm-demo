package com.hrmdemo.controller.auth;

import java.util.UUID;

import com.hrmdemo.dto.auth.AccountResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.auth.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping("/api/accounts/{id}")
    @Operation(summary = "One Account; your own, or any Account with data scope COMPANY")
    AccountResponse account(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return accountService.account(caller, id);
    }
}
