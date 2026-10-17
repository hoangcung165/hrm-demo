package com.hrmdemo.service.employee;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.ResignationRequest;
import com.hrmdemo.dto.employee.WorkHistoryItem;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.Role;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.Resignation;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.repository.auth.AccountSpecifications;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.employee.ProbationEvaluationRepository;
import com.hrmdemo.repository.employee.ResignationRepository;
import com.hrmdemo.repository.employee.WorkDecisionRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import com.hrmdemo.service.auth.TokenService;
import com.hrmdemo.service.legalentity.LegalEntityService;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ResignationService {
    private final EmployeeRepository employees;
    private final ResignationRepository resignations;
    private final WorkDecisionRepository decisions;
    private final ProbationEvaluationRepository evaluations;
    private final AccountRepository accounts;
    private final TokenService tokens;
    private final LegalEntityService legalEntity;
    private final AccessScopeService scopes;
    private final AuditRecorder audit;
    private final Clock clock;

    @Transactional
    public WorkHistoryItem create(CurrentAccount caller, UUID employeeId, ResignationRequest request) {
        AccessScope scope = scopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_EDIT);
        // Account writes also take this lock. It serializes the last-Admin check and account link changes.
        legalEntity.lockForStructureChange();
        Employee employee = employees.lockForRecordEdit(employeeId).orElseThrow(ResignationService::notFound);
        scope.requireEmployee(employeeId, employee.getOrgUnitId());
        if (!employee.isActive() || resignations.existsByEmployeeId(employeeId)) {
            throw new ApiException(HttpStatus.CONFLICT, "resignation.already_recorded", "Employee has already left");
        }
        if (request == null || request.lastWorkingDay() == null || request.reason() == null
                || request.reason().isBlank() || request.reason().trim().length() > 1000
                || request.lastWorkingDay().isBefore(employee.getHireDate())
                || request.lastWorkingDay().isAfter(LocalDate.now(clock))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "resignation.invalid", "Invalid last working day or reason");
        }
        LocalDate lastDay = request.lastWorkingDay();
        if (decisions.findByEmployeeIdOrderByEffectiveOnDescCreatedAtDesc(employeeId).stream()
                .anyMatch(d -> d.getEffectiveOn().isAfter(lastDay))
                || evaluations.findByEmployeeIdOrderByEndsOnDescCreatedAtDesc(employeeId).stream()
                        .anyMatch(e -> e.getEndsOn().isAfter(lastDay))) {
            throw new ApiException(HttpStatus.CONFLICT, "resignation.backdated",
                    "Last working day cannot precede an existing work-history milestone");
        }
        Optional<Account> linked = accounts.findByEmployeeId(employeeId);
        linked.filter(Account::isActive).ifPresent(account -> {
            if (account.holds(Role.ADMIN) && !account.isDemoPersona()
                    && accounts.count(AccountSpecifications.activeRealAdmins()) <= 1) {
                throw new ApiException(HttpStatus.CONFLICT, "account.last_admin",
                        "The company needs at least one active Admin");
            }
        });
        Resignation saved = resignations.saveAndFlush(new Resignation(employeeId, lastDay,
                request.reason().trim(), caller.id(), clock.instant()));
        employee.resign(clock.instant());
        linked.filter(Account::isActive).ifPresent(account -> {
            account.lock();
            tokens.revokeAll(account.getId());
        });
        audit.record(caller, AuditRegistrations.RESIGNATION, employeeId, AuditAction.CREATE,
                "Employee resignation recorded", null,
                Map.of("sourceId", saved.getId(), "lastWorkingDay", lastDay.toString(),
                        "reason", saved.getReason(), "actorId", caller.id()));
        return WorkHistoryItem.resignation(saved);
    }

    @Transactional(readOnly = true)
    public WorkHistoryItem get(CurrentAccount caller, UUID employeeId) {
        AccessScope scope = scopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_VIEW);
        Employee employee = employees.findById(employeeId).orElseThrow(ResignationService::notFound);
        scope.requireEmployee(employeeId, employee.getOrgUnitId());
        return resignations.findByEmployeeId(employeeId).map(WorkHistoryItem::resignation)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "resignation.not_found",
                        "Resignation not found"));
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "employee.not_found", "Employee not found");
    }
}
