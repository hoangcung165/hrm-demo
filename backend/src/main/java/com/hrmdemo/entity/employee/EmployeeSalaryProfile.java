package com.hrmdemo.entity.employee;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Immutable salary snapshot. Changes create another source document, never update this row. */
@Entity
@Table(name = "employee_salary_profile")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmployeeSalaryProfile extends LegalEntityOwned {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "employee_id", nullable = false, updatable = false) private UUID employeeId;
    @Column(name = "source_contract_id", nullable = false, updatable = false) private UUID sourceContractId;
    @Column(name = "source_amendment_id", updatable = false) private UUID sourceAmendmentId;
    @Column(name = "source_decision_id", updatable = false) private UUID sourceDecisionId;
    @Column(name = "effective_on", nullable = false, updatable = false) private LocalDate effectiveOn;
    @Column(name = "ends_on", updatable = false) private LocalDate endsOn;
    @Column(name = "base_salary", nullable = false, updatable = false) private BigDecimal baseSalary;
    @Column(name = "insurance_salary", updatable = false) private BigDecimal insuranceSalary;
    @Column(name = "allowances_json", nullable = false, updatable = false) private String allowancesJson;
    @Column(nullable = false, updatable = false) private boolean insured;
    @Column(name = "tax_method", nullable = false, updatable = false) private String taxMethod;
    @Column(name = "override_reason", updatable = false) private String overrideReason;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    public EmployeeSalaryProfile(UUID employeeId, UUID contractId, UUID amendmentId,
            LocalDate effectiveOn, LocalDate endsOn, BigDecimal salary, BigDecimal insuranceSalary,
            String allowancesJson, boolean insured, String taxMethod, String overrideReason, Instant now) {
        this(employeeId, contractId, amendmentId, null, effectiveOn, endsOn, salary, insuranceSalary,
                allowancesJson, insured, taxMethod, overrideReason, now);
    }

    public EmployeeSalaryProfile(UUID employeeId, UUID contractId, UUID amendmentId, UUID decisionId,
            LocalDate effectiveOn, LocalDate endsOn, BigDecimal salary, BigDecimal insuranceSalary,
            String allowancesJson, boolean insured, String taxMethod, String overrideReason, Instant now) {
        this.employeeId = employeeId;
        this.sourceContractId = contractId;
        this.sourceAmendmentId = amendmentId;
        this.sourceDecisionId = decisionId;
        this.effectiveOn = effectiveOn;
        this.endsOn = endsOn;
        this.baseSalary = salary;
        this.insuranceSalary = insuranceSalary;
        this.allowancesJson = allowancesJson;
        this.insured = insured;
        this.taxMethod = taxMethod;
        this.overrideReason = overrideReason;
        this.createdAt = now;
    }
}
