package com.hrmdemo.dto.employee;

import com.hrmdemo.entity.employee.EmploymentContract;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record EmploymentContractResponse(UUID id, UUID employeeId, String contractNumber,
        String contractType, LocalDate signedOn, LocalDate startsOn, LocalDate endsOn,
        BigDecimal baseSalary, BigDecimal insuranceSalary, String allowancesJson,
        boolean insured, String taxMethod) {
    public static EmploymentContractResponse from(EmploymentContract value) {
        return new EmploymentContractResponse(value.getId(), value.getEmployeeId(),
                value.getContractNumber(), value.getContractType(), value.getSignedOn(),
                value.getStartsOn(), value.getEndsOn(), value.getBaseSalary(),
                value.getInsuranceSalary(), value.getAllowancesJson(), value.isInsured(),
                value.getTaxMethod());
    }
}
