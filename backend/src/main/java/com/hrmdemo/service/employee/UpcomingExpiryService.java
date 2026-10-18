package com.hrmdemo.service.employee;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.ExpiryType;
import com.hrmdemo.dto.employee.UpcomingExpiriesResponse;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.UpcomingExpiryRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import java.time.Clock;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UpcomingExpiryService {
    private final UpcomingExpiryRepository expiries;
    private final AccessScopeService scopes;
    private final CurrentLegalEntity legalEntity;
    private final Clock clock;

    @Transactional(readOnly = true)
    public UpcomingExpiriesResponse list(CurrentAccount caller, ExpiryType type, LocalDate from,
            LocalDate to, int page, int size) {
        var scope = scopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_VIEW);
        scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW);
        LocalDate today = LocalDate.now(clock);
        LocalDate first = from == null ? today : from;
        LocalDate last = to == null ? today.plusDays(365) : to;
        if (page < 0 || page > 10000 || size < 1 || size > 100 || first.isBefore(today)
                || last.isBefore(first) || last.isAfter(today.plusDays(365))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "expiry.invalid_filter",
                    "Use a date range within the next 365 days, page 0..10000 and size 1..100");
        }
        var filter = scope.employeeFilter();
        var query = new UpcomingExpiryRepository.Query(legalEntity.id(), filter.all(), filter.orgUnitIds(),
                filter.selfEmployeeId(), type, today, first, last);
        return new UpcomingExpiriesResponse(expiries.list(query, page * size, size), expiries.count(query),
                page, size, today);
    }
}
