package com.hrmdemo.dto.employee;

import com.hrmdemo.entity.employee.EmploymentContract;
import com.hrmdemo.entity.employee.EmployeeSalaryProfile;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** An editable starting point; it is never persisted until the contract endpoint validates it. */
public record FormalContractSuggestion(UUID sourceContractId, String contractType, LocalDate startsOn,
        LocalDate endsOn, BigDecimal baseSalary, BigDecimal insuranceSalary, String allowancesJson,
        boolean insured, String taxMethod) {
    public static FormalContractSuggestion from(EmploymentContract contract, EmployeeSalaryProfile salary) {
        // The formal contract starts after the trial contract to satisfy the no-overlap rule.
        return new FormalContractSuggestion(contract.getId(), "INDEFINITE", contract.getEndsOn().plusDays(1),
                null, salary.getBaseSalary(), salary.getInsuranceSalary(), salary.getAllowancesJson(),
                true, "PROGRESSIVE");
    }
}
