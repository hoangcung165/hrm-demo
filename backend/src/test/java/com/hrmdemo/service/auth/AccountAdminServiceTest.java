package com.hrmdemo.service.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.DataScope;
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
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.legalentity.LegalEntityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

/** What an Admin may do to Accounts, in business terms. The stored Accounts sit behind the mocked repository. */
@ExtendWith(MockitoExtension.class)
class AccountAdminServiceTest {

    static final Instant EARLIER = Instant.parse("2026-10-01T08:00:00Z");
    static final Instant NOW = Instant.parse("2026-10-05T08:00:00Z");
    static final UUID ADMIN_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final UUID TARGET_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
    static final UUID NEW_ID = UUID.fromString("00000000-0000-0000-0000-000000000003");
    static final UUID EMPLOYEE_ID = UUID.fromString("00000000-0000-0000-0000-0000000000e1");
    static final CurrentAccount ADMIN = new CurrentAccount(ADMIN_ID, Set.of("ADMIN"));

    @Mock
    AccountRepository accounts;
    @Mock
    AccountEmployees employees;
    @Mock
    LegalEntityService legalEntityService;
    @Mock
    PasswordEncoder passwordEncoder;
    @Mock
    TokenService tokenService;

    AccountAdminService service;

    @BeforeEach
    void setUp() {
        service = new AccountAdminService(accounts, employees, legalEntityService,
                new AccessScopeService(employeeId -> Set.of()), Mappers.getMapper(AccountMapper.class),
                passwordEncoder, tokenService, Clock.fixed(NOW, ZoneOffset.UTC));
        lenient().when(passwordEncoder.encode(anyString())).thenAnswer(call -> "hashed:" + call.getArgument(0));
        lenient().when(accounts.save(any(Account.class))).thenAnswer(call -> {
            Account saved = call.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", NEW_ID);
            return saved;
        });
    }

    // --- create ---

    @Test
    void theAdminCreatesAnActiveAccountWithATemporaryPassword() {
        AccountResponse created = service.create(ADMIN,
                createRequest("Trần Thị Mai", "mai.tran@hrm.test", List.of("HR", "EMPLOYEE")));

        ArgumentCaptor<Account> saved = ArgumentCaptor.forClass(Account.class);
        verify(accounts).save(saved.capture());
        Account account = saved.getValue();
        assertThat(account.getEmail()).isEqualTo("mai.tran@hrm.test");
        assertThat(account.getFullName()).isEqualTo("Trần Thị Mai");
        assertThat(account.getSearchText()).isEqualTo("tran thi mai mai.tran@hrm.test");
        assertThat(account.getPasswordHash()).isEqualTo("hashed:Temp-2026-abc");
        assertThat(account.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(account.getCreatedAt()).isEqualTo(NOW);
        assertThat(account.getEmployeeId()).isNull();
        assertThat(account.roleNames()).containsExactlyInAnyOrder("HR", "EMPLOYEE");

        assertThat(created.id()).isEqualTo(NEW_ID);
        assertThat(created.fullName()).isEqualTo("Trần Thị Mai");
        assertThat(created.status()).isEqualTo("ACTIVE");
        assertThat(created.dataScope()).isEqualTo(DataScope.COMPANY);
        assertThat(created.roles()).containsExactlyInAnyOrder("HR", "EMPLOYEE");
    }

    @Test
    void theRequestTrimsTheNameAndTrimsAndLowerCasesTheEmail() {
        AccountCreateRequest request = createRequest("  Trần Thị Mai ", "  Mai.Tran@HRM.Test ", List.of("HR"));

        assertThat(request.fullName()).isEqualTo("Trần Thị Mai");
        assertThat(request.email()).isEqualTo("mai.tran@hrm.test");
        AccountUpdateRequest update = new AccountUpdateRequest(" Mai ", " MAI@hrm.test", List.of("HR"), null);
        assertThat(update.fullName()).isEqualTo("Mai");
        assertThat(update.email()).isEqualTo("mai@hrm.test");
    }

    @Test
    void creatingTakesTheCompanyWideLockBeforeItLooksForTheEmail() {
        service.create(ADMIN, createRequest("Trần Thị Mai", "mai.tran@hrm.test", List.of("HR")));

        InOrder order = inOrder(legalEntityService, accounts);
        order.verify(legalEntityService).lockForStructureChange();
        order.verify(accounts).findByEmail("mai.tran@hrm.test");
        order.verify(accounts).save(any(Account.class));
    }

    @Test
    void anEmailThatAnotherAccountHoldsIsRefusedAndNamesTheHolder() {
        Account holder = stored(TARGET_ID, "Lê Thị Hoa", "mai.tran@hrm.test", Role.EMPLOYEE);

        assertThatThrownBy(() -> service.create(ADMIN,
                createRequest("Trần Thị Mai", "Mai.Tran@HRM.test", List.of("HR"))))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus().value()).isEqualTo(409);
                    assertThat(ex.getCode()).isEqualTo("account.email_taken");
                    assertThat(ex.getProperties().get("holder"))
                            .isEqualTo(new AccountRef(holder.getId(), "Lê Thị Hoa"));
                });
        verify(accounts, never()).save(any(Account.class));
    }

    @Test
    void anAccountCannotBeLinkedToAnUnknownOrInactiveEmployee() {
        var request = new AccountCreateRequest("Trần Thị Mai", "mai.tran@hrm.test", List.of("HR"), "Temp-2026-abc",
                EMPLOYEE_ID);

        assertCode(400, "account.employee_not_found", () -> service.create(ADMIN, request));
        verify(accounts, never()).save(any(Account.class));
    }

    @Test
    void anAccountIsLinkedToAnActiveEmployee() {
        when(employees.isActiveEmployee(EMPLOYEE_ID)).thenReturn(true);
        var request = new AccountCreateRequest("Trần Thị Mai", "mai.tran@hrm.test", List.of("HR"), "Temp-2026-abc",
                EMPLOYEE_ID);

        service.create(ADMIN, request);

        ArgumentCaptor<Account> saved = ArgumentCaptor.forClass(Account.class);
        verify(accounts).save(saved.capture());
        assertThat(saved.getValue().getEmployeeId()).isEqualTo(EMPLOYEE_ID);
    }

    @Test
    void theResponseShowsTheLinkedEmployee() {
        when(employees.isActiveEmployee(EMPLOYEE_ID)).thenReturn(true);
        AccountEmployee mai = new AccountEmployee(EMPLOYEE_ID, "Trần Thị Mai", "NV00003", "Phòng Hành chính - Nhân sự",
                "OFFICIAL");
        when(employees.describe(List.of(EMPLOYEE_ID))).thenReturn(Map.of(EMPLOYEE_ID, mai));

        AccountResponse created = service.create(ADMIN, new AccountCreateRequest("Trần Thị Mai", "mai.tran@hrm.test",
                List.of("HR"), "Temp-2026-abc", EMPLOYEE_ID));

        assertThat(created.employee()).isEqualTo(mai);
    }

    @Test
    void anEmployeeLinkedToAnotherAccountIsRefusedAndNamesThatAccount() {
        when(employees.isActiveEmployee(EMPLOYEE_ID)).thenReturn(true);
        Account holder = stored(TARGET_ID, "Lê Thị Hoa", "hoa.le@hrm.test", Role.EMPLOYEE);
        holder.linkEmployee(EMPLOYEE_ID);
        when(accounts.findByEmployeeId(EMPLOYEE_ID)).thenReturn(Optional.of(holder));
        var request = new AccountCreateRequest("Trần Thị Mai", "mai.tran@hrm.test", List.of("HR"), "Temp-2026-abc",
                EMPLOYEE_ID);

        assertThatThrownBy(() -> service.create(ADMIN, request))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus().value()).isEqualTo(409);
                    assertThat(ex.getCode()).isEqualTo("account.employee_taken");
                    assertThat(ex.getProperties().get("holder")).isEqualTo(new AccountRef(TARGET_ID, "Lê Thị Hoa"));
                });
        verify(accounts, never()).save(any(Account.class));
    }

    @Test
    void editingAnAccountKeepsItsOwnLinkWithoutAConflict() {
        Account target = stored(TARGET_ID, "Lê Thị Hoa", "hoa.le@hrm.test", Role.EMPLOYEE);
        UUID other = UUID.randomUUID();
        target.linkEmployee(other);
        when(employees.isActiveEmployee(EMPLOYEE_ID)).thenReturn(true);
        when(accounts.findByEmployeeId(EMPLOYEE_ID)).thenReturn(Optional.empty());

        service.update(ADMIN, TARGET_ID,
                new AccountUpdateRequest("Lê Thị Hoa", "hoa.le@hrm.test", List.of("EMPLOYEE"), EMPLOYEE_ID));

        assertThat(target.getEmployeeId()).isEqualTo(EMPLOYEE_ID);
    }

    @Test
    void aDemoPersonaIsLinkedToItsEmployeeOnlyWhenNothingElseHoldsEither() {
        Account persona = storedPersona(DemoPersona.HR);
        when(accounts.findByDemoPersona(DemoPersona.HR)).thenReturn(Optional.of(persona));
        when(employees.isActiveEmployee(EMPLOYEE_ID)).thenReturn(true);
        when(accounts.findByEmployeeId(EMPLOYEE_ID)).thenReturn(Optional.empty());

        assertThat(service.linkDemoPersonaAsSystem(DemoPersona.HR, EMPLOYEE_ID)).isTrue();
        assertThat(persona.getEmployeeId()).isEqualTo(EMPLOYEE_ID);

        // Already linked: left as it is.
        assertThat(service.linkDemoPersonaAsSystem(DemoPersona.HR, UUID.randomUUID())).isFalse();
        assertThat(persona.getEmployeeId()).isEqualTo(EMPLOYEE_ID);
        // No such persona Account (the personas are off).
        assertThat(service.linkDemoPersonaAsSystem(DemoPersona.DIRECTOR, EMPLOYEE_ID)).isFalse();
    }

    @Test
    void anUnknownRoleNameMakesTheRequestInvalid() {
        assertInvalidRoles(() -> service.create(ADMIN,
                createRequest("Trần Thị Mai", "mai.tran@hrm.test", List.of("HR", "BOSS"))));
        assertInvalidRoles(() -> service.create(ADMIN,
                createRequest("Trần Thị Mai", "mai.tran@hrm.test", List.of("hr"))));
        assertInvalidRoles(() -> service.update(ADMIN, TARGET_ID,
                new AccountUpdateRequest("Trần Thị Mai", "mai.tran@hrm.test", List.of("BOSS"), null)));
        verify(accounts, never()).save(any(Account.class));
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = "ADMIN", mode = EnumSource.Mode.EXCLUDE)
    void onlyTheAdminMayCreateEditOrSetAPasswordAndNothingIsTouchedForAnyoneElse(Role role) {
        CurrentAccount caller = new CurrentAccount(ADMIN_ID, Set.of(role.name()));

        assertCode(403, "auth.forbidden", () -> service.create(caller,
                createRequest("Trần Thị Mai", "mai.tran@hrm.test", List.of("HR"))));
        assertCode(403, "auth.forbidden", () -> service.update(caller, TARGET_ID,
                new AccountUpdateRequest("Trần Thị Mai", "mai.tran@hrm.test", List.of("HR"), null)));
        assertCode(403, "auth.forbidden",
                () -> service.setPassword(caller, TARGET_ID, new AccountPasswordRequest("New-temp-2026")));

        verifyNoInteractions(accounts, legalEntityService, tokenService, passwordEncoder);
    }

    // --- edit ---

    @Test
    void editingChangesNameEmailAndRolesButNotStatusPasswordOrSessions() {
        Account account = stored(TARGET_ID, "Trần Thị Mai", "mai.tran@hrm.test", Role.HR, Role.EMPLOYEE);

        AccountResponse edited = service.update(ADMIN, TARGET_ID, new AccountUpdateRequest("Đỗ Thị Mai",
                "mai.do@hrm.test", List.of("EMPLOYEE", "ACCOUNTANT"), null));

        assertThat(account.getFullName()).isEqualTo("Đỗ Thị Mai");
        assertThat(account.getEmail()).isEqualTo("mai.do@hrm.test");
        assertThat(account.getSearchText()).isEqualTo("do thi mai mai.do@hrm.test");
        assertThat(account.roleNames()).containsExactlyInAnyOrder("EMPLOYEE", "ACCOUNTANT");
        assertThat(account.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(account.getPasswordHash()).isEqualTo("old-hash");
        assertThat(account.getCreatedAt()).isEqualTo(EARLIER);
        assertThat(edited.id()).isEqualTo(TARGET_ID);
        assertThat(edited.fullName()).isEqualTo("Đỗ Thị Mai");
        assertThat(edited.email()).isEqualTo("mai.do@hrm.test");
        assertThat(edited.roles()).containsExactlyInAnyOrder("EMPLOYEE", "ACCOUNTANT");
        verifyNoInteractions(tokenService, passwordEncoder);
        InOrder order = inOrder(legalEntityService, accounts);
        order.verify(legalEntityService).lockForStructureChange();
        order.verify(accounts).findById(TARGET_ID);
    }

    @Test
    void editingWithTheSameEmailDoesNotLookForAnotherHolder() {
        Account account = stored(TARGET_ID, "Trần Thị Mai", "mai.tran@hrm.test", Role.HR);

        service.update(ADMIN, TARGET_ID,
                new AccountUpdateRequest("Trần Thị Mai Anh", "MAI.TRAN@hrm.test", List.of("HR"), null));

        assertThat(account.getFullName()).isEqualTo("Trần Thị Mai Anh");
        verify(accounts, never()).findByEmail(anyString());
    }

    @Test
    void editingCannotTakeTheEmailOfAnotherAccount() {
        Account account = stored(TARGET_ID, "Trần Thị Mai", "mai.tran@hrm.test", Role.HR);
        Account holder = account(ADMIN_ID, "Lê Thị Hoa", "hoa.le@hrm.test", Role.EMPLOYEE);
        when(accounts.findByEmail("hoa.le@hrm.test")).thenReturn(Optional.of(holder));

        assertThatThrownBy(() -> service.update(ADMIN, TARGET_ID,
                new AccountUpdateRequest("Trần Thị Mai", "hoa.le@hrm.test", List.of("HR"), null)))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getCode()).isEqualTo("account.email_taken");
                    assertThat(ex.getProperties().get("holder"))
                            .isEqualTo(new AccountRef(ADMIN_ID, "Lê Thị Hoa"));
                });
        assertThat(account.getEmail()).as("nothing was changed").isEqualTo("mai.tran@hrm.test");
    }

    @Test
    void editingAnAccountThatDoesNotExistIsNotFound() {
        when(accounts.findById(TARGET_ID)).thenReturn(Optional.empty());

        assertCode(404, "account.not_found", () -> service.update(ADMIN, TARGET_ID,
                new AccountUpdateRequest("Trần Thị Mai", "mai.tran@hrm.test", List.of("HR"), null)));
    }

    @Test
    void editingCannotLinkAnEmployeeUntilEmployeesExist() {
        Account account = stored(TARGET_ID, "Trần Thị Mai", "mai.tran@hrm.test", Role.HR);

        assertCode(400, "account.employee_not_found", () -> service.update(ADMIN, TARGET_ID,
                new AccountUpdateRequest("Đỗ Thị Mai", "mai.tran@hrm.test", List.of("HR"), EMPLOYEE_ID)));
        assertThat(account.getFullName()).as("nothing was changed").isEqualTo("Trần Thị Mai");
    }

    @Test
    void anEmployeeThatIsAlreadyLinkedIsNotCheckedAgain() {
        Account account = stored(TARGET_ID, "Trần Thị Mai", "mai.tran@hrm.test", Role.HR);
        account.linkEmployee(EMPLOYEE_ID);

        service.update(ADMIN, TARGET_ID,
                new AccountUpdateRequest("Đỗ Thị Mai", "mai.tran@hrm.test", List.of("HR"), EMPLOYEE_ID));

        assertThat(account.getFullName()).isEqualTo("Đỗ Thị Mai");
        assertThat(account.getEmployeeId()).isEqualTo(EMPLOYEE_ID);
        verify(employees, never()).isActiveEmployee(any());
        verify(accounts, never()).findByEmployeeId(any());
    }

    // --- the last active Admin ---

    @Test
    void theAdminRoleCannotBeRemovedFromTheLastActiveAdmin() {
        Account lastAdmin = stored(TARGET_ID, "Đỗ Minh Quân", "quan.do@hrm.test", Role.ADMIN, Role.EMPLOYEE);
        activeAdmins(1);

        assertCode(409, "account.last_admin", () -> service.update(ADMIN, TARGET_ID,
                new AccountUpdateRequest("Đỗ Minh Quân", "quan.do@hrm.test", List.of("EMPLOYEE"), null)));

        assertThat(lastAdmin.roleNames()).containsExactlyInAnyOrder("ADMIN", "EMPLOYEE");
    }

    @Test
    void theAdminRoleCanBeRemovedWhileAnotherActiveAdminRemains() {
        Account admin = stored(TARGET_ID, "Đỗ Minh Quân", "quan.do@hrm.test", Role.ADMIN, Role.EMPLOYEE);
        activeAdmins(2);

        service.update(ADMIN, TARGET_ID,
                new AccountUpdateRequest("Đỗ Minh Quân", "quan.do@hrm.test", List.of("EMPLOYEE"), null));

        assertThat(admin.roleNames()).containsExactly("EMPLOYEE");
    }

    @Test
    void anAdminMayGiveUpTheirOwnAdminRoleWhenAnotherActiveAdminExistsButNotAsTheLastOne() {
        Account myself = stored(ADMIN_ID, "Đỗ Minh Quân", "quan.do@hrm.test", Role.ADMIN);
        var withoutAdmin = new AccountUpdateRequest("Đỗ Minh Quân", "quan.do@hrm.test", List.of("HR"), null);

        activeAdmins(1);
        assertCode(409, "account.last_admin", () -> service.update(ADMIN, ADMIN_ID, withoutAdmin));
        assertThat(myself.holds(Role.ADMIN)).isTrue();

        activeAdmins(2);
        service.update(ADMIN, ADMIN_ID, withoutAdmin);
        assertThat(myself.roleNames()).containsExactly("HR");
    }

    @Test
    void aLockedAdminDoesNotCountSoItMayLoseTheRole() {
        Account lockedAdmin = stored(TARGET_ID, "Đỗ Minh Quân", "quan.do@hrm.test", Role.ADMIN);
        ReflectionTestUtils.setField(lockedAdmin, "status", AccountStatus.LOCKED);

        service.update(ADMIN, TARGET_ID,
                new AccountUpdateRequest("Đỗ Minh Quân", "quan.do@hrm.test", List.of("EMPLOYEE"), null));

        assertThat(lockedAdmin.roleNames()).containsExactly("EMPLOYEE");
        assertThat(lockedAdmin.getStatus()).isEqualTo(AccountStatus.LOCKED);
        verify(accounts, never()).count(ArgumentMatchers.<Specification<Account>>any());
    }

    @Test
    void keepingOrAddingTheAdminRoleNeedsNoOtherAdmin() {
        Account admin = stored(TARGET_ID, "Đỗ Minh Quân", "quan.do@hrm.test", Role.ADMIN);

        service.update(ADMIN, TARGET_ID,
                new AccountUpdateRequest("Đỗ Minh Quân", "quan.do@hrm.test", List.of("ADMIN", "HR"), null));

        assertThat(admin.roleNames()).containsExactlyInAnyOrder("ADMIN", "HR");
        verify(accounts, never()).count(ArgumentMatchers.<Specification<Account>>any());
    }

    // --- temporary password ---

    @Test
    void settingAPasswordStoresItsHashAndSignsTheAccountOutEverywhere() {
        Account account = stored(TARGET_ID, "Trần Thị Mai", "mai.tran@hrm.test", Role.HR);

        service.setPassword(ADMIN, TARGET_ID, new AccountPasswordRequest("New-temp-2026"));

        assertThat(account.getPasswordHash()).isEqualTo("hashed:New-temp-2026");
        verify(tokenService).revokeAll(TARGET_ID);
    }

    @Test
    void settingAPasswordOnALockedAccountLeavesItLocked() {
        Account account = stored(TARGET_ID, "Trần Thị Mai", "mai.tran@hrm.test", Role.HR);
        ReflectionTestUtils.setField(account, "status", AccountStatus.LOCKED);

        service.setPassword(ADMIN, TARGET_ID, new AccountPasswordRequest("New-temp-2026"));

        assertThat(account.getPasswordHash()).isEqualTo("hashed:New-temp-2026");
        assertThat(account.getStatus()).isEqualTo(AccountStatus.LOCKED);
    }

    @Test
    void anAdminCannotSetTheirOwnPasswordThisWay() {
        assertCode(409, "account.cannot_set_own_password",
                () -> service.setPassword(ADMIN, ADMIN_ID, new AccountPasswordRequest("New-temp-2026")));

        verifyNoInteractions(accounts, tokenService, passwordEncoder);
    }

    @Test
    void settingAPasswordOnAnAccountThatDoesNotExistIsNotFound() {
        when(accounts.findById(TARGET_ID)).thenReturn(Optional.empty());

        assertCode(404, "account.not_found",
                () -> service.setPassword(ADMIN, TARGET_ID, new AccountPasswordRequest("New-temp-2026")));
        verifyNoInteractions(tokenService);
    }

    // --- lock and unlock ---

    @Test
    void lockingAnAccountEndsItsSessionsUnderTheCompanyWideLock() {
        Account account = stored(TARGET_ID, "Trần Thị Mai", "mai.tran@hrm.test", Role.HR);

        AccountResponse locked = service.lock(ADMIN, TARGET_ID);

        assertThat(account.getStatus()).isEqualTo(AccountStatus.LOCKED);
        assertThat(locked.id()).isEqualTo(TARGET_ID);
        assertThat(locked.status()).isEqualTo("LOCKED");
        InOrder order = inOrder(legalEntityService, accounts, tokenService);
        order.verify(legalEntityService).lockForStructureChange();
        order.verify(accounts).findById(TARGET_ID);
        order.verify(tokenService).revokeAll(TARGET_ID);
        // Not an Admin, so the number of Admins is not even asked.
        verify(accounts, never()).count(ArgumentMatchers.<Specification<Account>>any());
    }

    @Test
    void lockingALockedAccountChangesNothing() {
        Account account = stored(TARGET_ID, "Đỗ Minh Quân", "quan.do@hrm.test", Role.ADMIN);
        ReflectionTestUtils.setField(account, "status", AccountStatus.LOCKED);

        AccountResponse locked = service.lock(ADMIN, TARGET_ID);

        assertThat(locked.status()).isEqualTo("LOCKED");
        assertThat(account.getStatus()).isEqualTo(AccountStatus.LOCKED);
        verifyNoInteractions(tokenService);
        verify(accounts, never()).count(ArgumentMatchers.<Specification<Account>>any());
    }

    @Test
    void unlockingAnAccountLetsItSignInAgainAndBringsNoSessionBack() {
        Account account = stored(TARGET_ID, "Trần Thị Mai", "mai.tran@hrm.test", Role.HR);
        ReflectionTestUtils.setField(account, "status", AccountStatus.LOCKED);

        AccountResponse unlocked = service.unlock(ADMIN, TARGET_ID);

        assertThat(account.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(account.isActive()).isTrue();
        assertThat(unlocked.status()).isEqualTo("ACTIVE");
        assertThat(account.getPasswordHash()).isEqualTo("old-hash");
        verifyNoInteractions(tokenService, passwordEncoder);
        verify(legalEntityService).lockForStructureChange();
    }

    @Test
    void unlockingAnActiveAccountChangesNothing() {
        Account account = stored(TARGET_ID, "Trần Thị Mai", "mai.tran@hrm.test", Role.HR);

        assertThat(service.unlock(ADMIN, TARGET_ID).status()).isEqualTo("ACTIVE");

        assertThat(account.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        verifyNoInteractions(tokenService);
    }

    @Test
    void nobodyLocksOrUnlocksTheirOwnAccount() {
        assertCode(409, "account.cannot_lock_self", () -> service.lock(ADMIN, ADMIN_ID));
        assertCode(409, "account.cannot_unlock_self", () -> service.unlock(ADMIN, ADMIN_ID));

        verifyNoInteractions(accounts, legalEntityService, tokenService);
    }

    @Test
    void theLastActiveAdminCannotBeLocked() {
        Account lastAdmin = stored(TARGET_ID, "Đỗ Minh Quân", "quan.do@hrm.test", Role.ADMIN, Role.EMPLOYEE);
        activeAdmins(1);

        assertCode(409, "account.last_admin", () -> service.lock(ADMIN, TARGET_ID));

        assertThat(lastAdmin.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        verifyNoInteractions(tokenService);
    }

    @Test
    void theLastActiveAdminCannotBeLockedByACallerWhoseTokenStillSaysAdmin() {
        // The caller was an Admin when the token was issued and has since lost the role or been locked: the
        // database holds one active Admin, the target. The rule counts Accounts, it does not trust the token.
        CurrentAccount staleAdmin = new CurrentAccount(ADMIN_ID, Set.of("ADMIN"));
        Account lastAdmin = stored(TARGET_ID, "Đỗ Minh Quân", "quan.do@hrm.test", Role.ADMIN);
        activeAdmins(1);

        assertCode(409, "account.last_admin", () -> service.lock(staleAdmin, TARGET_ID));

        assertThat(lastAdmin.isActive()).isTrue();
        // The caller's own Account is never read: the count alone decides.
        verify(accounts, never()).findById(ADMIN_ID);
    }

    @Test
    void anAdminCanBeLockedWhileAnotherActiveAdminRemains() {
        Account admin = stored(TARGET_ID, "Đỗ Minh Quân", "quan.do@hrm.test", Role.ADMIN);
        activeAdmins(2);

        assertThat(service.lock(ADMIN, TARGET_ID).status()).isEqualTo("LOCKED");

        assertThat(admin.getStatus()).isEqualTo(AccountStatus.LOCKED);
        verify(tokenService).revokeAll(TARGET_ID);
    }

    @Test
    void lockingOrUnlockingAnAccountThatDoesNotExistIsNotFound() {
        when(accounts.findById(TARGET_ID)).thenReturn(Optional.empty());

        assertCode(404, "account.not_found", () -> service.lock(ADMIN, TARGET_ID));
        assertCode(404, "account.not_found", () -> service.unlock(ADMIN, TARGET_ID));
        verifyNoInteractions(tokenService);
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = "ADMIN", mode = EnumSource.Mode.EXCLUDE)
    void onlyTheAdminMayLockAndUnlock(Role role) {
        CurrentAccount caller = new CurrentAccount(ADMIN_ID, Set.of(role.name()));

        assertCode(403, "auth.forbidden", () -> service.lock(caller, TARGET_ID));
        assertCode(403, "auth.forbidden", () -> service.unlock(caller, TARGET_ID));

        verifyNoInteractions(accounts, legalEntityService, tokenService);
    }

    // --- demo personas ---

    @Test
    void aDemoPersonaAccountCannotBeEditedOrGivenAPassword() {
        Account persona = storedPersona(DemoPersona.HR);

        assertCode(409, "account.demo_persona_not_editable", () -> service.update(ADMIN, TARGET_ID,
                new AccountUpdateRequest("Someone Else", "else@hrm.test", List.of("ADMIN"), null)));
        assertCode(409, "account.demo_persona_not_editable",
                () -> service.setPassword(ADMIN, TARGET_ID, new AccountPasswordRequest("New-temp-2026")));

        assertThat(persona.getFullName()).isEqualTo("Trần Thị Mai");
        assertThat(persona.getEmail()).isEqualTo("demo.hr@hrm.local");
        assertThat(persona.roleNames()).containsExactlyInAnyOrder("HR", "EMPLOYEE");
        assertThat(persona.getPasswordHash()).isEqualTo("old-hash");
        verifyNoInteractions(tokenService, passwordEncoder);
    }

    @Test
    void aDemoPersonaAccountCanBeLockedAndUnlocked() {
        Account persona = storedPersona(DemoPersona.HR);

        assertThat(service.lock(ADMIN, TARGET_ID).status()).isEqualTo("LOCKED");
        assertThat(persona.getStatus()).isEqualTo(AccountStatus.LOCKED);
        verify(tokenService).revokeAll(TARGET_ID);

        AccountResponse unlocked = service.unlock(ADMIN, TARGET_ID);
        assertThat(unlocked.status()).isEqualTo("ACTIVE");
        assertThat(unlocked.demoPersona()).isEqualTo("HR");
    }

    @Test
    void theAdminPersonaCanBeLockedWithoutAskingHowManyAdminsRemain() {
        // The persona is not one of the Admins the rule protects, so even as the "only Admin" it may go.
        Account persona = storedPersona(DemoPersona.ADMIN);

        assertThat(service.lock(ADMIN, TARGET_ID).status()).isEqualTo("LOCKED");

        assertThat(persona.getStatus()).isEqualTo(AccountStatus.LOCKED);
        verify(accounts, never()).count(ArgumentMatchers.<Specification<Account>>any());
    }

    @Test
    void anOrdinaryAccountShowsNoPersona() {
        stored(TARGET_ID, "Trần Thị Mai", "mai.tran@hrm.test", Role.HR);

        assertThat(service.unlock(ADMIN, TARGET_ID).demoPersona()).isNull();
    }

    // --- helpers ---

    /** A demo persona Account the repository finds under {@link #TARGET_ID}. */
    private Account storedPersona(DemoPersona demoPersona) {
        Account persona = Account.forDemoPersona(demoPersona, "old-hash", EARLIER);
        ReflectionTestUtils.setField(persona, "id", TARGET_ID);
        lenient().when(accounts.findById(TARGET_ID)).thenReturn(Optional.of(persona));
        return persona;
    }


    private static AccountCreateRequest createRequest(String fullName, String email, List<String> roles) {
        return new AccountCreateRequest(fullName, email, roles, "Temp-2026-abc", null);
    }

    /** An Account the repository finds by its id and by its email. */
    private Account stored(UUID id, String fullName, String email, Role... roles) {
        Account account = account(id, fullName, email, roles);
        lenient().when(accounts.findById(id)).thenReturn(Optional.of(account));
        lenient().when(accounts.findByEmail(email)).thenReturn(Optional.of(account));
        return account;
    }

    private static Account account(UUID id, String fullName, String email, Role... roles) {
        Account account = new Account(email, fullName, "old-hash", EARLIER);
        ReflectionTestUtils.setField(account, "id", id);
        for (Role role : roles) {
            account.addRole(role);
        }
        return account;
    }

    /** How many active Accounts hold the Admin role, the edited one included. */
    private void activeAdmins(long count) {
        when(accounts.count(ArgumentMatchers.<Specification<Account>>any())).thenReturn(count);
    }

    private static void assertInvalidRoles(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getStatus().value()).isEqualTo(400);
            assertThat(ex.getCode()).isEqualTo("validation.invalid");
            assertThat(ex.getProperties().get("errors"))
                    .isEqualTo(List.of(Map.of("field", "roles", "code", "Invalid")));
        });
    }

    private static void assertCode(int status, String code, Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getStatus().value()).isEqualTo(status);
            assertThat(ex.getCode()).isEqualTo(code);
        });
    }
}
