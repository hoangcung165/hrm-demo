package com.hrmdemo.service.employee;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeBankAccount;
import com.hrmdemo.entity.employee.EmployeeDependent;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeBankAccountRepository;
import com.hrmdemo.repository.employee.EmployeeDependentRepository;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Profile records: the Employee row serializes mutations to a person's bank accounts.
 * Flush the old default before selecting another so the partial unique index is never violated.
 */
@Service
@RequiredArgsConstructor
public class EmployeeRecordsService {
    public record BankRequest(String bankName, String accountNumber, String accountHolder, boolean defaultAccount) {}
    public record BankView(UUID id, String bankName, String accountNumber, String accountHolder,
            boolean defaultAccount, boolean masked) {}
    public record DependentRequest(String fullName, String relationship, LocalDate dateOfBirth,
            LocalDate effectiveFrom, LocalDate effectiveTo) {}
    public record DependentView(UUID id, String fullName, String relationship, LocalDate dateOfBirth,
            LocalDate effectiveFrom, LocalDate effectiveTo) {}

    private final EmployeeRepository employees;
    private final EmployeeBankAccountRepository bankAccounts;
    private final EmployeeDependentRepository dependentsRepository;
    private final AccessScopeService accessScopes;
    private final Clock clock;

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "employee.record_not_found", "Employee record not found");
    }

    private AccessScope scope(CurrentAccount caller, UUID employeeId, boolean edit, boolean sensitive) {
        AccessScope scope = accessScopes.scopeOf(caller);
        if (edit) {
            scope.require(Permission.EMPLOYEE_EDIT);
            if (sensitive) scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW);
        } else if (!employeeId.equals(caller.employeeId())) {
            scope.require(Permission.EMPLOYEE_VIEW);
        }
        Employee employee = employees.findById(employeeId).orElseThrow(EmployeeRecordsService::notFound);
        if (edit || !employeeId.equals(caller.employeeId())) {
            scope.requireEmployee(employee.getId(), employee.getOrgUnitId());
        }
        return scope;
    }

    /** Must be invoked after authorization and in the same write transaction. */
    private void lockEmployee(UUID employeeId) {
        employees.lockForRecordEdit(employeeId).orElseThrow(EmployeeRecordsService::notFound);
    }

    private static BankRequest valid(BankRequest r) {
        if (r == null) throw new ApiException(HttpStatus.BAD_REQUEST, "employee.invalid_field", "Missing bank account");
        return new BankRequest(
                EmployeeProfileRecordsRules.required(r.bankName(), "bankName", 150),
                EmployeeProfileRecordsRules.required(r.accountNumber(), "accountNumber", 50),
                EmployeeProfileRecordsRules.required(r.accountHolder(), "accountHolder", 150), r.defaultAccount());
    }

    private static DependentRequest valid(DependentRequest r) {
        if (r == null) throw new ApiException(HttpStatus.BAD_REQUEST, "employee.invalid_field", "Missing dependent");
        EmployeeProfileRecordsRules.dependentDates(r.effectiveFrom(), r.effectiveTo());
        return new DependentRequest(
                EmployeeProfileRecordsRules.required(r.fullName(), "fullName", 150),
                EmployeeProfileRecordsRules.required(r.relationship(), "relationship", 80),
                r.dateOfBirth(), r.effectiveFrom(), r.effectiveTo());
    }

    private static BankView view(EmployeeBankAccount a, boolean sensitive) {
        String number = a.getAccountNumber();
        return new BankView(a.getId(), a.getBankName(),
                sensitive ? number : mask(number), a.getAccountHolder(), a.isDefaultAccount(), !sensitive);
    }

    private static String mask(String number) {
        int hidden = Math.max(0, number.length() - 4);
        return "•".repeat(hidden) + number.substring(hidden);
    }

    private static DependentView view(EmployeeDependent d) {
        return new DependentView(d.getId(), d.getFullName(), d.getRelationship(), d.getDateOfBirth(),
                d.getEffectiveFrom(), d.getEffectiveTo());
    }

    @Transactional(readOnly = true)
    public List<BankView> banks(CurrentAccount caller, UUID employeeId) {
        AccessScope scope = scope(caller, employeeId, false, false);
        boolean sensitive = employeeId.equals(caller.employeeId())
                || scope.has(Permission.EMPLOYEE_SENSITIVE_VIEW);
        return bankAccounts.findByEmployeeIdOrderByCreatedAtAsc(employeeId).stream()
                .map(a -> view(a, sensitive)).toList();
    }

    @Transactional
    public BankView addBank(CurrentAccount caller, UUID employeeId, BankRequest input) {
        scope(caller, employeeId, true, true);
        BankRequest r = valid(input);
        lockEmployee(employeeId);
        List<EmployeeBankAccount> existing = bankAccounts.findByEmployeeIdOrderByCreatedAtAsc(employeeId);
        Instant now = clock.instant();
        boolean makeDefault = existing.isEmpty() || r.defaultAccount();
        if (makeDefault) clearDefault(existing, now);
        EmployeeBankAccount saved = bankAccounts.save(new EmployeeBankAccount(employeeId,
                r.bankName(), r.accountNumber(), r.accountHolder(), makeDefault, now));
        bankAccounts.flush();
        return view(saved, true);
    }

    @Transactional
    public BankView editBank(CurrentAccount caller, UUID employeeId, UUID id, BankRequest input) {
        scope(caller, employeeId, true, true);
        BankRequest r = valid(input);
        lockEmployee(employeeId);
        List<EmployeeBankAccount> existing = bankAccounts.findByEmployeeIdOrderByCreatedAtAsc(employeeId);
        EmployeeBankAccount target = bankAccounts.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(EmployeeRecordsService::notFound);
        Instant now = clock.instant();
        if (r.defaultAccount()) {
            clearDefault(existing, now);
        } else if (target.isDefaultAccount() && existing.size() > 1) {
            // A default may be removed only by choosing a replacement explicitly.
            throw new ApiException(HttpStatus.CONFLICT, "employee.default_bank_required",
                    "Choose another default bank account first");
        }
        target.edit(r.bankName(), r.accountNumber(), r.accountHolder(), now);
        if (r.defaultAccount()) target.setDefaultAccount(true, now);
        bankAccounts.flush();
        return view(target, true);
    }

    @Transactional
    public void deleteBank(CurrentAccount caller, UUID employeeId, UUID id) {
        scope(caller, employeeId, true, true);
        lockEmployee(employeeId);
        List<EmployeeBankAccount> existing = bankAccounts.findByEmployeeIdOrderByCreatedAtAsc(employeeId);
        EmployeeBankAccount target = bankAccounts.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(EmployeeRecordsService::notFound);
        boolean wasDefault = target.isDefaultAccount();
        bankAccounts.delete(target);
        bankAccounts.flush();
        if (wasDefault) {
            existing.stream().filter(a -> !a.getId().equals(id)).findFirst().ifPresent(a -> {
                a.setDefaultAccount(true, clock.instant());
                bankAccounts.flush();
            });
        }
    }

    private void clearDefault(List<EmployeeBankAccount> existing, Instant now) {
        existing.stream().filter(EmployeeBankAccount::isDefaultAccount).forEach(a -> a.setDefaultAccount(false, now));
        bankAccounts.flush();
    }

    @Transactional(readOnly = true)
    public List<DependentView> dependents(CurrentAccount caller, UUID employeeId) {
        scope(caller, employeeId, false, false);
        return dependentsRepository.findByEmployeeIdOrderByEffectiveFromDesc(employeeId)
                .stream().map(EmployeeRecordsService::view).toList();
    }

    @Transactional
    public DependentView addDependent(CurrentAccount caller, UUID employeeId, DependentRequest input) {
        scope(caller, employeeId, true, false);
        DependentRequest r = valid(input);
        EmployeeDependent d = new EmployeeDependent(employeeId, r.fullName(), r.relationship(),
                r.dateOfBirth(), r.effectiveFrom(), r.effectiveTo(), clock.instant());
        return view(dependentsRepository.save(d));
    }

    @Transactional
    public DependentView editDependent(CurrentAccount caller, UUID employeeId, UUID id, DependentRequest input) {
        scope(caller, employeeId, true, false);
        DependentRequest r = valid(input);
        EmployeeDependent d = dependentsRepository.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(EmployeeRecordsService::notFound);
        d.edit(r.fullName(), r.relationship(), r.dateOfBirth(), r.effectiveFrom(), r.effectiveTo(), clock.instant());
        return view(d);
    }

    @Transactional
    public void deleteDependent(CurrentAccount caller, UUID employeeId, UUID id) {
        scope(caller, employeeId, true, false);
        EmployeeDependent d = dependentsRepository.findByIdAndEmployeeId(id, employeeId)
                .orElseThrow(EmployeeRecordsService::notFound);
        dependentsRepository.delete(d);
    }
}
