package com.hrmdemo.dto.employee;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmploymentContractRequest(
        String contractNumber, String contractType, LocalDate signedOn,
        LocalDate startsOn, LocalDate endsOn, BigDecimal baseSalary,
        BigDecimal insuranceSalary, String allowancesJson, Boolean insured, String taxMethod, String overrideReason,
        LocalDate probationStartsOn, LocalDate probationEndsOn) {
    public EmploymentContractRequest(String contractNumber, String contractType, LocalDate signedOn,
            LocalDate startsOn, LocalDate endsOn, BigDecimal baseSalary,
            BigDecimal insuranceSalary, String allowancesJson, Boolean insured, String taxMethod,
            String overrideReason) {
        this(contractNumber, contractType, signedOn, startsOn, endsOn, baseSalary,
                insuranceSalary, allowancesJson, insured, taxMethod, overrideReason, null, null);
    }
    public EmploymentContractRequest(String contractNumber, String contractType, LocalDate signedOn,
            LocalDate startsOn, LocalDate endsOn, BigDecimal baseSalary,
            BigDecimal insuranceSalary, String allowancesJson, Boolean insured, String taxMethod) {
        this(contractNumber, contractType, signedOn, startsOn, endsOn, baseSalary,
                insuranceSalary, allowancesJson, insured, taxMethod, null);
    }
}
