package com.hrmdemo.controller.auth;

import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.auth.AccountCreateRequest;
import com.hrmdemo.dto.auth.AccountListQuery;
import com.hrmdemo.dto.auth.AccountPasswordRequest;
import com.hrmdemo.dto.auth.AccountResponse;
import com.hrmdemo.dto.auth.AccountUpdateRequest;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.auth.AccountAdminService;
import com.hrmdemo.service.auth.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final AccountAdminService accountAdminService;

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

    @PostMapping("/api/accounts")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create an Account with a temporary password; needs ACCOUNT_EDIT")
    AccountResponse create(@Parameter(hidden = true) CurrentAccount caller,
            @Valid @RequestBody AccountCreateRequest request) {
        return accountAdminService.create(caller, request);
    }

    @PutMapping("/api/accounts/{id}")
    @Operation(summary = "Edit an Account's full name, email, roles and Employee; needs ACCOUNT_EDIT")
    AccountResponse update(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @Valid @RequestBody AccountUpdateRequest request) {
        return accountAdminService.update(caller, id, request);
    }

    @PutMapping("/api/accounts/{id}/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Set a temporary password for another Account and end its sessions; needs ACCOUNT_EDIT")
    void setPassword(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @Valid @RequestBody AccountPasswordRequest request) {
        accountAdminService.setPassword(caller, id, request);
    }

    @GetMapping("/api/accounts/{id}")
    @Operation(summary = "One Account; your own, or any Account with data scope COMPANY")
    AccountResponse account(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return accountService.account(caller, id);
    }
}
