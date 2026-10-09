package com.hrmdemo.service.auth;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hrmdemo.dto.PageResponse;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.auth.AccountEmployee;
import com.hrmdemo.dto.auth.AccountListQuery;
import com.hrmdemo.dto.auth.AccountResponse;
import com.hrmdemo.entity.SearchText;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.AccountStatus;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.mapper.auth.AccountMapper;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.repository.auth.AccountSpecifications;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/** Reading Accounts within the caller's Access scope. */
@Service
@RequiredArgsConstructor
public class AccountService {

    public static final int MAX_PAGE_SIZE = 100;
    static final int MAX_SEARCH_LENGTH = 100;

    /**
     * Sort keys of the list and the entity property behind each. The full name sorts by the search text
     * (the name without accents, in lower case), so the order does not depend on the database collation.
     */
    private static final Map<String, String> SORT_PROPERTIES = Map.of(
            "fullName", "searchText",
            "email", "email",
            "createdAt", "createdAt",
            "status", "status");

    private final AccountRepository accounts;
    private final AccessScopeService accessScopes;
    private final AccountMapper mapper;
    private final AccountEmployees employees;

    /** An Account can always read itself; another Account needs company scope. */
    @Transactional(readOnly = true)
    public AccountResponse account(CurrentAccount caller, UUID accountId) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.ACCOUNT_VIEW);
        // Checked before the lookup, so the answer does not reveal which ids exist.
        scope.requireAccount(accountId);
        return accounts.findById(accountId)
                .map(account -> toResponse(account, linkedEmployees(List.of(account))))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "account.not_found", "Account not found"));
    }

    /** One page of the company's Accounts, filtered and sorted in the database. */
    @Transactional(readOnly = true)
    public PageResponse<AccountResponse> accounts(CurrentAccount caller, AccountListQuery query) {
        accessScopes.scopeOf(caller).require(Permission.ACCOUNT_LIST);
        if (query.page() < 0) {
            throw invalid("page");
        }
        if (query.size() < 1 || query.size() > MAX_PAGE_SIZE) {
            throw invalid("size");
        }
        if (query.q() != null && query.q().length() > MAX_SEARCH_LENGTH) {
            throw invalid("q");
        }
        Role role = enumValue(Role.class, query.role(), "role");
        AccountStatus status = enumValue(AccountStatus.class, query.status(), "status");
        // A term of only spaces or accents searches for nothing.
        String search = query.q() == null || SearchText.of(query.q()).isEmpty()
                ? null
                : SearchText.containsPattern(query.q());
        PageRequest page = PageRequest.of(query.page(), query.size(), sort(query.sort()));
        Page<Account> found = accounts.findAll(AccountSpecifications.matching(search, role, status), page);
        Map<UUID, AccountEmployee> linked = linkedEmployees(found.getContent());
        return PageResponse.of(found, account -> toResponse(account, linked));
    }

    /** The Employees linked to the Accounts, in one lookup. */
    private Map<UUID, AccountEmployee> linkedEmployees(Collection<Account> page) {
        return employees.describe(page.stream().map(Account::getEmployeeId).filter(Objects::nonNull)
                .collect(Collectors.toSet()));
    }

    private AccountResponse toResponse(Account account, Map<UUID, AccountEmployee> linked) {
        return mapper.toResponse(account, accessScopes.widestDataScope(account.roleNames()),
                account.getEmployeeId() == null ? null : linked.get(account.getEmployeeId()));
    }

    /** {@code property} or {@code property,asc|desc}; ties are broken by id, so pages do not overlap. */
    private static Sort sort(String sort) {
        String[] parts = StringUtils.hasText(sort) ? sort.trim().split(",", -1) : new String[] {"fullName"};
        String property = SORT_PROPERTIES.get(parts[0].trim());
        String direction = parts.length > 1 ? parts[1].trim().toLowerCase(Locale.ROOT) : "asc";
        if (property == null || parts.length > 2 || !(direction.equals("asc") || direction.equals("desc"))) {
            throw invalid("sort");
        }
        Sort.Direction order = direction.equals("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        return Sort.by(order, property).and(Sort.by(Sort.Direction.ASC, "id"));
    }

    /** The constant with exactly this name; null for a missing or blank value. */
    private static <E extends Enum<E>> E enumValue(Class<E> type, String name, String field) {
        if (!StringUtils.hasText(name)) {
            return null;
        }
        for (E constant : type.getEnumConstants()) {
            if (constant.name().equals(name.trim())) {
                return constant;
            }
        }
        throw invalid(field);
    }

    /** Same shape as a failed body validation: {@code validation.invalid} with the field. Also for the writes. */
    static ApiException invalid(String field) {
        return new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request value is invalid: " + field)
                .with("errors", List.of(Map.of("field", field, "code", "Invalid")));
    }

    /**
     * The Employees whose unlocked Account holds the role, e.g. the HR approvers of a Luồng phê duyệt. Whether the
     * Employee is still active is for the caller to check.
     */
    @Transactional(readOnly = true)
    public List<UUID> employeeIdsWithRole(Role role) {
        return accounts.findEmployeeIdsWithRole(role, AccountStatus.ACTIVE);
    }

}
