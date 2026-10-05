package com.hrmdemo.service.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.accessscope.DataScope;
import com.hrmdemo.dto.auth.AccountListQuery;
import com.hrmdemo.dto.auth.AccountResponse;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.mapper.auth.AccountMapper;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    static final UUID ME = UUID.fromString("00000000-0000-0000-0000-000000000001");
    static final UUID SOMEONE_ELSE = UUID.fromString("00000000-0000-0000-0000-000000000002");
    static final Instant CREATED = Instant.parse("2026-10-04T08:00:00Z");
    static final AccountListQuery FIRST_PAGE = new AccountListQuery(0, 20, null, null, null, null);

    @Mock
    AccountRepository accounts;

    AccountService service;

    @BeforeEach
    void setUp() {
        service = new AccountService(accounts, new AccessScopeService(employeeId -> Set.of()),
                Mappers.getMapper(AccountMapper.class));
    }

    @Test
    void anEmployeeReadsTheirOwnAccount() {
        stored(ME, Role.EMPLOYEE);

        AccountResponse mine = service.account(caller("EMPLOYEE"), ME);

        assertThat(mine.id()).isEqualTo(ME);
        assertThat(mine.email()).isEqualTo("mai.tran@hrm.test");
        assertThat(mine.fullName()).isEqualTo("Trần Thị Mai");
        assertThat(mine.roles()).containsExactly("EMPLOYEE");
        assertThat(mine.dataScope()).isEqualTo(DataScope.SELF);
        assertThat(mine.status()).isEqualTo("ACTIVE");
        assertThat(mine.createdAt()).isEqualTo(CREATED);
        assertThat(mine.employee()).as("Employees arrive with HRM-06").isNull();
        assertThat(mine.demoPersona()).isNull();
    }

    @Test
    void anEmployeeCannotReadAnotherAccountAndTheDatabaseIsNotEvenAsked() {
        assertCode(403, "auth.forbidden", () -> service.account(caller("EMPLOYEE"), SOMEONE_ELSE));

        verifyNoInteractions(accounts);
    }

    @Test
    void hrReadsAnotherAccount() {
        stored(SOMEONE_ELSE, Role.EMPLOYEE);

        assertThat(service.account(caller("HR"), SOMEONE_ELSE).id()).isEqualTo(SOMEONE_ELSE);
    }

    @Test
    void anAccountThatDoesNotExistIsNotFoundForACompanyWideCaller() {
        when(accounts.findById(SOMEONE_ELSE)).thenReturn(Optional.empty());

        assertCode(404, "account.not_found", () -> service.account(caller("HR"), SOMEONE_ELSE));
    }

    @Test
    void anAccountShowsTheWidestDataScopeOfItsRoles() {
        stored(SOMEONE_ELSE, Role.EMPLOYEE, Role.LINE_MANAGER);
        assertThat(service.account(caller("HR"), SOMEONE_ELSE).dataScope()).isEqualTo(DataScope.ORG_UNIT);

        stored(SOMEONE_ELSE, Role.EMPLOYEE, Role.LINE_MANAGER, Role.ACCOUNTANT);
        assertThat(service.account(caller("HR"), SOMEONE_ELSE).dataScope()).isEqualTo(DataScope.COMPANY);
    }

    @Test
    void theAdminListsAccountsOnePageAtATimeSortedByFullName() {
        ArgumentCaptor<Pageable> asked = listReturns(41, account(SOMEONE_ELSE, Role.HR, Role.EMPLOYEE));

        PageResponse<AccountResponse> page = service.accounts(caller("ADMIN"),
                new AccountListQuery(2, 10, null, null, null, null));

        assertThat(page.total()).isEqualTo(41);
        assertThat(page.items()).singleElement().satisfies(row -> {
            assertThat(row.id()).isEqualTo(SOMEONE_ELSE);
            assertThat(row.fullName()).isEqualTo("Trần Thị Mai");
            assertThat(row.roles()).containsExactly("HR", "EMPLOYEE");
            assertThat(row.dataScope()).isEqualTo(DataScope.COMPANY);
        });
        assertThat(asked.getValue().getPageNumber()).isEqualTo(2);
        assertThat(asked.getValue().getPageSize()).isEqualTo(10);
        // The name sorts by its text without accents; the id keeps equal names in a fixed order across pages.
        assertThat(asked.getValue().getSort())
                .isEqualTo(Sort.by(Sort.Order.asc("searchText"), Sort.Order.asc("id")));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "fullName | searchText | ASC",
        "fullName,desc | searchText | DESC",
        "email | email | ASC",
        "email,ASC | email | ASC",
        "createdAt,desc | createdAt | DESC",
        "status | status | ASC"})
    void theListSortsByTheAskedColumnAndDirection(String sort, String property, Sort.Direction direction) {
        ArgumentCaptor<Pageable> asked = listReturns(0);

        service.accounts(caller("ADMIN"), new AccountListQuery(0, 20, null, null, null, sort));

        assertThat(asked.getValue().getSort())
                .isEqualTo(Sort.by(new Sort.Order(direction, property), Sort.Order.asc("id")));
    }

    @Test
    void filtersThatAreBlankAreIgnoredAndKnownOnesAreAccepted() {
        listReturns(0);

        assertThat(service.accounts(caller("ADMIN"), new AccountListQuery(0, 100, " ", "", " ", "")).items())
                .isEmpty();
        assertThat(service.accounts(caller("ADMIN"), new AccountListQuery(0, 1, "trần", "HR", "LOCKED", "email"))
                .items()).isEmpty();
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = "ADMIN", mode = EnumSource.Mode.EXCLUDE)
    void onlyTheAdminMayListAccountsAndTheDatabaseIsNotAskedForAnyoneElse(Role role) {
        assertCode(403, "auth.forbidden", () -> service.accounts(caller(role.name()), FIRST_PAGE));

        verifyNoInteractions(accounts);
    }

    @ParameterizedTest
    @ValueSource(strings = {"BOSS", "hr", "ADMIN,HR"})
    void anUnknownRoleFilterIsInvalid(String role) {
        assertInvalid("role", new AccountListQuery(0, 20, null, role, null, null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"GONE", "active"})
    void anUnknownStatusFilterIsInvalid(String status) {
        assertInvalid("status", new AccountListQuery(0, 20, null, null, status, null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"passwordHash", "searchText", "fullName,up", "fullName,asc,desc", ",desc"})
    void anUnknownSortIsInvalid(String sort) {
        assertInvalid("sort", new AccountListQuery(0, 20, null, null, null, sort));
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -1, 101})
    void aPageSizeOutsideOneToAHundredIsInvalid(int size) {
        assertInvalid("size", new AccountListQuery(0, size, null, null, null, null));
    }

    @Test
    void aNegativePageAndAnOverlongSearchTermAreInvalid() {
        assertInvalid("page", new AccountListQuery(-1, 20, null, null, null, null));
        assertInvalid("q", new AccountListQuery(0, 20, "a".repeat(101), null, null, null));
    }

    private void assertInvalid(String field, AccountListQuery query) {
        assertThatThrownBy(() -> service.accounts(caller("ADMIN"), query))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus().value()).isEqualTo(400);
                    assertThat(ex.getCode()).isEqualTo("validation.invalid");
                    assertThat(ex.getProperties().get("errors"))
                            .isEqualTo(List.of(Map.of("field", field, "code", "Invalid")));
                });
        verifyNoInteractions(accounts);
    }

    private static void assertCode(int status, String code, Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, ex -> {
            assertThat(ex.getStatus().value()).isEqualTo(status);
            assertThat(ex.getCode()).isEqualTo(code);
        });
    }

    /** The repository answers every list query with these rows; captures the page request it was asked for. */
    private ArgumentCaptor<Pageable> listReturns(long total, Account... rows) {
        ArgumentCaptor<Pageable> asked = ArgumentCaptor.forClass(Pageable.class);
        when(accounts.findAll(ArgumentMatchers.<Specification<Account>>any(), asked.capture()))
                .thenAnswer(call -> new PageImpl<>(List.of(rows), call.getArgument(1), total));
        return asked;
    }

    private void stored(UUID id, Role... roles) {
        when(accounts.findById(id)).thenReturn(Optional.of(account(id, roles)));
    }

    private static Account account(UUID id, Role... roles) {
        var account = new Account("mai.tran@hrm.test", "Trần Thị Mai", "hash", CREATED);
        ReflectionTestUtils.setField(account, "id", id);
        for (Role role : roles) {
            account.addRole(role);
        }
        return account;
    }

    private static CurrentAccount caller(String role) {
        return new CurrentAccount(ME, Set.of(role));
    }
}
