package com.hrmdemo.service.employee;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.ContractListItem;
import com.hrmdemo.dto.employee.ContractListResponse;
import com.hrmdemo.dto.employee.ContractState;
import com.hrmdemo.entity.SearchText;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.ContractListRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The contracts of the company within the caller's Employee scope. Like the profile tab, it needs the sensitive permission. */
@Service
@RequiredArgsConstructor
public class ContractListService {
    static final int MAX_SIZE = 100;
    static final int MAX_SEARCH_LENGTH = 100;
    private static final ZoneId COMPANY_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final ContractListRepository contracts;
    private final AccessScopeService scopes;
    private final CurrentLegalEntity legalEntity;
    private final Clock clock;

    @Transactional(readOnly = true)
    public ContractListResponse list(CurrentAccount caller, String search, String type, ContractState state,
            int page, int size) {
        var scope = scopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_VIEW);
        scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW);
        String term = search == null ? "" : search.trim();
        String typeCode = type == null ? "" : type.trim().toUpperCase(Locale.ROOT);
        if (page < 0 || page > 10000 || size < 1 || size > MAX_SIZE || term.length() > MAX_SEARCH_LENGTH
                || typeCode.length() > 50) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "contract.invalid_filter",
                    "Use page 0..10000, size 1..100, a search of up to 100 characters and a contract type code");
        }
        LocalDate today = LocalDate.ofInstant(clock.instant(), COMPANY_ZONE);
        var filter = scope.employeeFilter();
        var query = new ContractListRepository.Query(legalEntity.id(), filter.all(), filter.orgUnitIds(),
                filter.selfEmployeeId(), typeCode, term.isEmpty() ? null : SearchText.containsPattern(term),
                state == null ? "ALL" : state.name(), today);
        var items = contracts.list(query, page * size, size).stream().map(row -> {
            ContractState rowState = ContractState.of(row.startsOn(), row.endsOn(), today);
            return new ContractListItem(row.id(), row.employeeId(), row.employeeCode(), row.employeeName(),
                    row.contractNumber(), row.contractType(), row.startsOn(), row.endsOn(), rowState,
                    ContractState.daysRemaining(rowState, row.endsOn(), today));
        }).toList();
        return new ContractListResponse(items, contracts.count(query), page, size, today);
    }
}
