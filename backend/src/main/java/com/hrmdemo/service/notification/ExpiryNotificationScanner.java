package com.hrmdemo.service.notification;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.ExpiryType;
import com.hrmdemo.dto.employee.UpcomingExpiryItem;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.AccountStatus;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeStatus;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.employee.ExpiryPolicyRepository;
import com.hrmdemo.repository.employee.UpcomingExpiryRepository;
import com.hrmdemo.service.accessscope.AccessScopeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Scans the same policy-window query as the API, then fans out only to eligible linked Accounts. */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExpiryNotificationScanner {
    private static final ZoneId COMPANY_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int PAGE_SIZE = 100;

    private final UpcomingExpiryRepository expiries;
    private final ExpiryPolicyRepository policies;
    private final AccountRepository accounts;
    private final EmployeeRepository employees;
    private final AccessScopeService scopes;
    private final CurrentLegalEntity legalEntity;
    private final ExpiryNoticeWriter writer;
    private final Clock clock;

    /** @return newly recorded bell lines; repeats and concurrent runs return zero for the same delivery keys. */
    public int scan() {
        LocalDate today = LocalDate.ofInstant(clock.instant(), COMPANY_ZONE);
        Map<ExpiryType, Integer> milestones = milestones();
        var recipients = recipients();
        var query = new UpcomingExpiryRepository.Query(legalEntity.id(), true, Set.of(), null, null,
                today, today, today.plusDays(365));
        int created = 0;
        for (int offset = 0; ; offset += PAGE_SIZE) {
            var page = expiries.list(query, offset, PAGE_SIZE);
            for (UpcomingExpiryItem item : page) {
                Integer days = milestones.get(item.type());
                if (days == null) throw new IllegalStateException("Missing expiry policy: " + item.type());
                Employee source = employees.findById(item.employeeId()).orElse(null);
                if (source == null || source.getStatus() == EmployeeStatus.INACTIVE) continue;
                for (Account account : recipients.values()) {
                    if (eligible(account, source) && writer.record(item, days, account.getEmployeeId())) created++;
                }
            }
            if (page.size() < PAGE_SIZE) break;
        }
        if (created > 0) log.info("Recorded {} expiry warning(s)", created);
        return created;
    }

    @Transactional(readOnly = true)
    public Map<ExpiryType, Integer> milestones() {
        Map<ExpiryType, Integer> result = new HashMap<>();
        policies.findAll().forEach(p -> result.put(p.getDocumentType(), p.getAdvanceDays()));
        return result;
    }

    @Transactional(readOnly = true)
    public Map<UUID, Account> recipients() {
        Map<UUID, Account> result = new HashMap<>();
        Set<UUID> active = new HashSet<>();
        employees.findAll().stream().filter(e -> e.getStatus() != EmployeeStatus.INACTIVE)
                .forEach(e -> active.add(e.getId()));
        for (Account account : accounts.findByStatusAndEmployeeIdIsNotNull(AccountStatus.ACTIVE)) {
            if (active.contains(account.getEmployeeId())) result.put(account.getEmployeeId(), account);
        }
        return result;
    }

    boolean eligible(Account account, Employee source) {
        if (account.getEmployeeId().equals(source.getId())) return true;
        if (!account.holds(Role.HR) && !account.holds(Role.LINE_MANAGER)) return false;
        var scope = scopes.scopeOf(account.getId(), account.getEmployeeId(), account.getRoles().stream()
                .map(r -> r.getRole()).collect(java.util.stream.Collectors.toSet()));
        return scope.has(Permission.EMPLOYEE_VIEW) && scope.has(Permission.EMPLOYEE_SENSITIVE_VIEW)
                && scope.coversEmployee(source.getId(), source.getOrgUnitId());
    }
}
