package com.hrmdemo.service.employee;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.employee.SalaryProfileSegment;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.employee.Employee;
import com.hrmdemo.entity.employee.EmployeeSalaryProfile;
import com.hrmdemo.entity.employee.EmploymentContract;
import com.hrmdemo.entity.employee.ContractAmendment;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.repository.employee.EmployeeSalaryProfileRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Personnel-derived effective dated pay. Payroll must call this boundary rather than read contracts. */
@Service
@RequiredArgsConstructor
public class SalaryProfileService {
    private final EmployeeSalaryProfileRepository profiles;
    private final EmployeeRepository employees;
    private final AccessScopeService scopes;
    private final Clock clock;
    private final AuditRecorder audit;

    @Transactional(readOnly = true)
    public List<SalaryProfileSegment> period(CurrentAccount caller, UUID employeeId,
            LocalDate from, LocalDate to) {
        AccessScope scope = scopes.scopeOf(caller);
        scope.require(Permission.EMPLOYEE_VIEW);
        scope.require(Permission.EMPLOYEE_SENSITIVE_VIEW);
        Employee e = employees.findById(employeeId).orElseThrow(() ->
                new ApiException(HttpStatus.NOT_FOUND,"employee.not_found","Employee not found"));
        scope.requireEmployee(employeeId,e.getOrgUnitId());
        return segments(profiles.findByEmployeeIdOrderByEffectiveOnAsc(employeeId), from, to);
    }

    /** Snapshot from signed contract: source documents, not direct salary edits. */
    void fromContract(CurrentAccount caller, EmploymentContract contract, String overrideReason) {
        EmployeeSalaryProfile snapshot = new EmployeeSalaryProfile(contract.getEmployeeId(), contract.getId(), null,
                contract.getStartsOn(), contract.getEndsOn(), contract.getBaseSalary(),
                contract.getInsuranceSalary(), contract.getAllowancesJson(), contract.isInsured(),
                contract.getTaxMethod(), overrideReason, clock.instant());
        audit.record(caller, AuditRegistrations.SALARY_PROFILE, contract.getEmployeeId(), AuditAction.CREATE,
                "Salary profile created from contract", null, auditValues(snapshot));
        profiles.save(snapshot);
    }

    /** A salary-changing amendment starts a new snapshot, inheriting unchanged fields. */
    void fromAmendment(CurrentAccount caller, EmploymentContract contract, ContractAmendment amendment,
            BigDecimal salary, BigDecimal insuranceSalary, String allowancesJson,
            Boolean insured, String taxMethod, String overrideReason) {
        List<EmployeeSalaryProfile> prior = profiles.findByEmployeeIdOrderByEffectiveOnAsc(contract.getEmployeeId());
        EmployeeSalaryProfile previous = null;
        for (EmployeeSalaryProfile candidate : prior) {
            if (!candidate.getEffectiveOn().isAfter(amendment.getEffectiveOn())
                    && (candidate.getEndsOn() == null || !candidate.getEndsOn().isBefore(amendment.getEffectiveOn()))) {
                previous = candidate;
            }
        }
        if (previous == null) {
            throw new ApiException(HttpStatus.CONFLICT,"salary_profile.no_source","No effective salary profile");
        }
        if (prior.stream().anyMatch(p -> p.getEffectiveOn().equals(amendment.getEffectiveOn()))) {
            throw new ApiException(HttpStatus.CONFLICT,"salary_profile.same_effective_date",
                    "One salary change per employee and effective date");
        }
        if ((insured != null && insured != previous.isInsured()
                || taxMethod != null && !taxMethod.equals(previous.getTaxMethod()))
                && (overrideReason == null || overrideReason.isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,"salary_profile.override_reason_required",
                    "Changes to insurance and tax flags require an audit reason");
        }
        EmployeeSalaryProfile snapshot = new EmployeeSalaryProfile(contract.getEmployeeId(),contract.getId(),amendment.getId(),
                amendment.getEffectiveOn(),contract.getEndsOn(),
                salary == null ? previous.getBaseSalary() : salary,
                insuranceSalary == null ? previous.getInsuranceSalary() : insuranceSalary,
                allowancesJson == null ? previous.getAllowancesJson() : allowancesJson,
                insured == null ? previous.isInsured() : insured,
                taxMethod == null ? previous.getTaxMethod() : taxMethod,
                overrideReason,clock.instant());
        audit.record(caller, AuditRegistrations.SALARY_PROFILE, contract.getEmployeeId(), AuditAction.UPDATE,
                "Salary profile changed by amendment", auditValues(previous), auditValues(snapshot));
        profiles.save(snapshot);
    }

    private static Map<String, Object> auditValues(EmployeeSalaryProfile profile) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("employeeId", profile.getEmployeeId());
        values.put("sourceContractId", profile.getSourceContractId());
        values.put("sourceAmendmentId", profile.getSourceAmendmentId());
        values.put("effectiveOn", profile.getEffectiveOn().toString());
        values.put("endsOn", profile.getEndsOn() == null ? null : profile.getEndsOn().toString());
        values.put("baseSalary", profile.getBaseSalary());
        values.put("insuranceSalary", profile.getInsuranceSalary());
        values.put("allowancesJson", profile.getAllowancesJson());
        values.put("insured", profile.isInsured());
        values.put("taxMethod", profile.getTaxMethod());
        values.put("overrideReason", profile.getOverrideReason());
        return values;
    }

    /** Inclusive dates. Effective dates split the requested interval without changing stored source history. */
    public static List<SalaryProfileSegment> segments(List<EmployeeSalaryProfile> history,
            LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,"salary_profile.invalid_period",
                    "The period must have from <= to");
        }
        List<SalaryProfileSegment> result = new ArrayList<>();
        for (int i = 0; i < history.size(); i++) {
            EmployeeSalaryProfile p = history.get(i);
            LocalDate next = i + 1 < history.size() ? history.get(i + 1).getEffectiveOn() : null;
            LocalDate end = p.getEndsOn();
            if (next != null) {
                LocalDate dayBefore = next.minusDays(1);
                if (end == null || end.isAfter(dayBefore)) end = dayBefore;
            }
            LocalDate begin = p.getEffectiveOn().isAfter(from) ? p.getEffectiveOn() : from;
            LocalDate finish = end == null || end.isAfter(to) ? to : end;
            if (!begin.isAfter(finish)) result.add(SalaryProfileSegment.of(begin,finish,p));
        }
        return result;
    }
}
