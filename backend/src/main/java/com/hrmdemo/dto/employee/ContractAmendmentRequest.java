package com.hrmdemo.dto.employee;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContractAmendmentRequest(String amendmentNumber, LocalDate signedOn,
        LocalDate effectiveOn, String description, BigDecimal baseSalary,
        BigDecimal insuranceSalary, String allowancesJson, Boolean insured,
        String taxMethod, String overrideReason) {
    public ContractAmendmentRequest(String amendmentNumber, LocalDate signedOn,
            LocalDate effectiveOn, String description) {
        this(amendmentNumber, signedOn, effectiveOn, description, null, null, null, null, null, null);
    }
}
