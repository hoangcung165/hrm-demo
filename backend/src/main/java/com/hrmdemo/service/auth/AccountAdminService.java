package com.hrmdemo.service.auth;

import java.time.Clock;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.auth.AccountCreateRequest;
import com.hrmdemo.dto.auth.AccountEmployee;
import com.hrmdemo.dto.auth.AccountPasswordRequest;
import com.hrmdemo.dto.auth.AccountRef;
import com.hrmdemo.dto.auth.AccountResponse;
import com.hrmdemo.dto.auth.AccountUpdateRequest;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.AccountStatus;
import com.hrmdemo.entity.auth.DemoPersona;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.mapper.auth.AccountMapper;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.repository.auth.AccountSpecifications;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.legalentity.LegalEntityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * What an Admin does to Tài khoản (Accounts): create, edit, set a temporary password, lock and unlock.
 * <p>
 * Every change but the password first takes the company-wide lock
 * ({@link LegalEntityService#lockForStructureChange()}) and then reads, so two changes at the same time
 * cannot give two Accounts the same email or leave the company without an active Admin (the same approach
 * as the org structure).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountAdminService {

    private final AccountRepository accounts;
    private final AccountEmployees employees;
    private final LegalEntityService legalEntityService;
    private final AccessScopeService accessScopes;
    private final AccountMapper mapper;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final Clock clock;

    /** A new Account is active and signs in with the temporary password. */
    @Transactional
    public AccountResponse create(CurrentAccount caller, AccountCreateRequest request) {
        lockForChange(caller);
        Set<Role> roles = roles(request.roles());
        requireEmailFree(request.email(), null);
        if (request.employeeId() != null) {
            requireEmployee(request.employeeId(), null);
        }
        Account account = new Account(request.email(), request.fullName(),
                passwordEncoder.encode(request.password()), clock.instant());
        roles.forEach(account::addRole);
        account.linkEmployee(request.employeeId());
        Account saved = accounts.save(account);
        log.info("Account {} created by Account {}", saved.getId(), caller.id());
        return toResponse(saved);
    }

    /** Changes full name, email, roles and Employee. The status, the password and the sessions are not touched. */
    @Transactional
    public AccountResponse update(CurrentAccount caller, UUID accountId, AccountUpdateRequest request) {
        lockForChange(caller);
        Set<Role> roles = roles(request.roles());
        Account account = requireEditable(accountId);
        // Every rule first, then the changes.
        boolean newEmail = !account.getEmail().equals(request.email());
        if (newEmail) {
            requireEmailFree(request.email(), account);
        }
        // An unchanged Employee is not checked again: editing the name must still work after the Employee left.
        if (request.employeeId() != null && !request.employeeId().equals(account.getEmployeeId())) {
            requireEmployee(request.employeeId(), account);
        }
        if (account.holds(Role.ADMIN) && !roles.contains(Role.ADMIN)) {
            requireAnotherActiveAdmin(account);
        }
        if (newEmail) {
            account.changeEmail(request.email());
        }
        if (!account.getFullName().equals(request.fullName())) {
            account.rename(request.fullName());
        }
        account.replaceRoles(roles);
        account.linkEmployee(request.employeeId());
        log.info("Account {} edited by Account {}", account.getId(), caller.id());
        return toResponse(account);
    }

    /**
     * Sets a new temporary password for another Account and signs it out everywhere. A locked Account stays
     * locked. One's own password changes only through change-password, which asks for the current one.
     */
    @Transactional
    public void setPassword(CurrentAccount caller, UUID accountId, AccountPasswordRequest request) {
        accessScopes.scopeOf(caller).require(Permission.ACCOUNT_EDIT);
        if (caller.id().equals(accountId)) {
            throw new ApiException(HttpStatus.CONFLICT, "account.cannot_set_own_password",
                    "Use change-password for your own Account");
        }
        Account account = requireEditable(accountId);
        account.changePassword(passwordEncoder.encode(request.password()));
        tokenService.revokeAll(account.getId());
        log.info("Password of Account {} set by Account {}", account.getId(), caller.id());
    }

    /**
     * Locks an Account: it cannot sign in any more and every session it has is ended. Locking a locked
     * Account changes nothing. The last active Admin cannot be locked, whoever asks: the rule looks at the
     * Accounts in the database, not at the caller's roles, which come from a token that may be out of date.
     */
    @Transactional
    public AccountResponse lock(CurrentAccount caller, UUID accountId) {
        accessScopes.scopeOf(caller).require(Permission.ACCOUNT_EDIT);
        if (caller.id().equals(accountId)) {
            throw new ApiException(HttpStatus.CONFLICT, "account.cannot_lock_self",
                    "You cannot lock your own Account");
        }
        legalEntityService.lockForStructureChange();
        Account account = require(accountId);
        if (account.isActive()) {
            if (account.holds(Role.ADMIN)) {
                requireAnotherActiveAdmin(account);
            }
            account.lock();
            tokenService.revokeAll(account.getId());
            log.info("Account {} locked by Account {}", account.getId(), caller.id());
        }
        return toResponse(account);
    }

    /**
     * Unlocks an Account: it can sign in again; the sessions ended by the lock stay ended. Unlocking an
     * active Account changes nothing. Nobody unlocks their own Account: a locked Admin may still hold an
     * access token for a few minutes and must not be able to undo the lock with it.
     */
    @Transactional
    public AccountResponse unlock(CurrentAccount caller, UUID accountId) {
        accessScopes.scopeOf(caller).require(Permission.ACCOUNT_EDIT);
        if (caller.id().equals(accountId)) {
            throw new ApiException(HttpStatus.CONFLICT, "account.cannot_unlock_self",
                    "You cannot unlock your own Account");
        }
        legalEntityService.lockForStructureChange();
        Account account = require(accountId);
        if (!account.isActive()) {
            if (account.getEmployeeId() != null && !employees.isActiveEmployee(account.getEmployeeId())) {
                throw new ApiException(HttpStatus.CONFLICT, "account.employee_inactive",
                        "A resigned Employee's Account cannot be unlocked");
            }
            account.unlock();
            log.info("Account {} unlocked by Account {}", account.getId(), caller.id());
        }
        return toResponse(account);
    }

    /** Permission check, then the lock: the reads that follow see what earlier changes committed. */
    private void lockForChange(CurrentAccount caller) {
        accessScopes.scopeOf(caller).require(Permission.ACCOUNT_EDIT);
        legalEntityService.lockForStructureChange();
    }

    private Account require(UUID accountId) {
        return accounts.findById(accountId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "account.not_found", "Account not found"));
    }

    /** Demo personas keep the name, email, roles and unknown password the seeder gave them; only the lock changes. */
    private Account requireEditable(UUID accountId) {
        Account account = require(accountId);
        if (account.isDemoPersona()) {
            throw new ApiException(HttpStatus.CONFLICT, "account.demo_persona_not_editable",
                    "A demo persona Account cannot be edited");
        }
        return account;
    }

    /** Role names as the request gives them; one that is not a {@link Role} makes the request invalid. */
    private static Set<Role> roles(List<String> names) {
        Set<Role> roles = EnumSet.noneOf(Role.class);
        for (String name : names) {
            Role role = null;
            for (Role candidate : Role.values()) {
                if (candidate.name().equals(name)) {
                    role = candidate;
                }
            }
            if (role == null) {
                throw AccountService.invalid("roles");
            }
            roles.add(role);
        }
        return roles;
    }

    /** Emails are stored in lower case, so this is unique whatever the case; {@code self} is the edited Account. */
    private void requireEmailFree(String email, Account self) {
        accounts.findByEmail(email)
                .filter(holder -> self == null || !Objects.equals(holder.getId(), self.getId()))
                .ifPresent(holder -> {
                    throw new ApiException(HttpStatus.CONFLICT, "account.email_taken",
                            "The email is already used by another Account")
                            .with("holder", new AccountRef(holder.getId(), holder.getFullName()));
                });
    }

    /**
     * A new link must point at an active Employee that no other Account is linked to.
     *
     * @param self the Account being edited, or null on create
     */
    private void requireEmployee(UUID employeeId, Account self) {
        if (!employees.isActiveEmployee(employeeId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "account.employee_not_found",
                    "The employee is not an active employee of the company");
        }
        accounts.findByEmployeeId(employeeId)
                .filter(holder -> self == null || !holder.getId().equals(self.getId()))
                .ifPresent(holder -> {
                    throw new ApiException(HttpStatus.CONFLICT, "account.employee_taken",
                            "The employee is already linked to another Account")
                            .with("holder", new AccountRef(holder.getId(), holder.getFullName()));
                });
    }

    /**
     * An Account for an example Employee who approves in the example data but is not a demo persona, for the example
     * data seeder. The password is random and thrown away, like a persona's. Does nothing when the email is taken or
     * the Employee is not active or already linked. Call it with the company-wide lock held.
     *
     * @return whether the Account was created
     */
    @Transactional
    public boolean createExampleAccountAsSystem(String email, String fullName, Set<Role> roles, UUID employeeId) {
        if (accounts.findByEmail(email).isPresent() || !employees.isActiveEmployee(employeeId)
                || accounts.findByEmployeeId(employeeId).isPresent()) {
            return false;
        }
        Account account = new Account(email, fullName, passwordEncoder.encode(OpaqueToken.generate()),
                clock.instant());
        roles.forEach(account::addRole);
        account.linkEmployee(employeeId);
        accounts.save(account);
        return true;
    }

    /**
     * Links a demo persona Account to its Employee, for the example data seeder (no signed-in Account, so never on
     * behalf of a request). Does nothing when the persona Account is missing or already linked, or when the
     * Employee is not active or is linked to another Account. Call it with the company-wide lock held.
     *
     * @return whether the link was made
     */
    @Transactional
    public boolean linkDemoPersonaAsSystem(DemoPersona persona, UUID employeeId) {
        Optional<Account> account = accounts.findByDemoPersona(persona);
        if (account.isEmpty() || account.get().getEmployeeId() != null || !employees.isActiveEmployee(employeeId)
                || accounts.findByEmployeeId(employeeId).isPresent()) {
            return false;
        }
        account.get().linkEmployee(employeeId);
        return true;
    }

    /**
     * The company must keep an Admin who can sign in. A locked Admin does not count, so it may lose the role.
     * Demo personas do not count either: they are gone when the demo flag is turned off.
     * Call it with the company-wide lock held.
     */
    private void requireAnotherActiveAdmin(Account account) {
        // A persona is not one of the Admins the rule protects, so losing it never matters.
        if (!account.isActive() || account.isDemoPersona()) {
            return;
        }
        long activeAdmins = accounts.count(AccountSpecifications.activeRealAdmins());
        if (activeAdmins <= 1) {
            throw new ApiException(HttpStatus.CONFLICT, "account.last_admin",
                    "The company needs at least one active Admin");
        }
    }

    private AccountResponse toResponse(Account account) {
        AccountEmployee employee = account.getEmployeeId() == null ? null
                : employees.describe(List.of(account.getEmployeeId())).get(account.getEmployeeId());
        return mapper.toResponse(account, accessScopes.widestDataScope(account.roleNames()), employee);
    }
}
