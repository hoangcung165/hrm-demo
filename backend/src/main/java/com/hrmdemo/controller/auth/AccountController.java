package com.hrmdemo.controller.auth;

import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.auth.AccountListQuery;
import com.hrmdemo.dto.auth.AccountResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.auth.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping("/api/accounts")
    @Operation(summary = "The company's Accounts, one page; needs ACCOUNT_LIST")
    PageResponse<AccountResponse> accounts(
            @Parameter(hidden = true) CurrentAccount caller,
            @Parameter(description = "Page number, from 0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Rows per page, 1 to 100") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Part of the full name or email; case and accents do not matter")
            @RequestParam(required = false) String q,
            @Parameter(schema = @Schema(allowableValues = {"ADMIN", "HR", "LINE_MANAGER", "PROJECT_MANAGER",
                    "ACCOUNTANT", "DIRECTOR", "EMPLOYEE"}))
            @RequestParam(required = false) String role,
            @Parameter(schema = @Schema(allowableValues = {"ACTIVE", "LOCKED"}))
            @RequestParam(required = false) String status,
            @Parameter(description = "fullName (default), email, createdAt or status; add ,asc or ,desc")
            @RequestParam(required = false) String sort) {
        return accountService.accounts(caller, new AccountListQuery(page, size, q, role, status, sort));
    }

    @GetMapping("/api/accounts/{id}")
    @Operation(summary = "One Account; your own, or any Account with data scope COMPANY")
    AccountResponse account(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return accountService.account(caller, id);
    }
}
