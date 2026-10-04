package com.hrmdemo.service.auth;

import java.util.UUID;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.auth.AccountResponse;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.mapper.auth.AccountMapper;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reading Accounts within the caller's Access scope. */
@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accounts;
    private final AccessScopeService accessScopes;
    private final AccountMapper mapper;

    /** An Account can always read itself; another Account needs company scope. */
    @Transactional(readOnly = true)
    public AccountResponse account(CurrentAccount caller, UUID accountId) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.ACCOUNT_VIEW);
        // Checked before the lookup, so the answer does not reveal which ids exist.
        scope.requireAccount(accountId);
        return accounts.findById(accountId)
                .map(mapper::toResponse)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "account.not_found", "Account not found"));
    }
}
