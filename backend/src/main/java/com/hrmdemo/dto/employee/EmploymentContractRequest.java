package com.hrmdemo.dto.employee;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmploymentContractRequest(
        String contractNumber, String contractType, LocalDate signedOn,
        LocalDate startsOn, LocalDate endsOn, BigDecimal baseSalary,
        BigDecimal insuranceSalary, String allowancesJson, Boolean insured, String taxMethod) {
}
