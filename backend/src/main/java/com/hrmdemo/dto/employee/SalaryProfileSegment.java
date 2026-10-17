package com.hrmdemo.dto.employee;

import com.hrmdemo.entity.employee.EmployeeSalaryProfile;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record SalaryProfileSegment(LocalDate from, LocalDate to, BigDecimal baseSalary,
        BigDecimal insuranceSalary, String allowancesJson, boolean insured, String taxMethod,
        UUID sourceContractId, UUID sourceAmendmentId, String overrideReason, UUID sourceDecisionId) {
    public static SalaryProfileSegment of(LocalDate from, LocalDate to, EmployeeSalaryProfile profile) {
        return new SalaryProfileSegment(from,to, profile.getBaseSalary(), profile.getInsuranceSalary(),
                profile.getAllowancesJson(), profile.isInsured(), profile.getTaxMethod(),
                profile.getSourceContractId(), profile.getSourceAmendmentId(), profile.getOverrideReason(),
                profile.getSourceDecisionId());
    }
}
