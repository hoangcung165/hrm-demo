package com.hrmdemo.entity.employee;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "employment_contract")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmploymentContract extends LegalEntityOwned {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "employee_id", nullable = false, updatable = false) private UUID employeeId;
    @Column(name = "contract_number", nullable = false) private String contractNumber;
    @Column(name = "contract_type", nullable = false) private String contractType;
    @Column(name = "signed_on", nullable = false) private LocalDate signedOn;
    @Column(name = "starts_on", nullable = false) private LocalDate startsOn;
    @Column(name = "ends_on") private LocalDate endsOn;
    @Column(name = "probation_starts_on") private LocalDate probationStartsOn;
    @Column(name = "probation_ends_on") private LocalDate probationEndsOn;
    @Column(name = "base_salary", nullable = false) private BigDecimal baseSalary;
    @Column(name = "insurance_salary") private BigDecimal insuranceSalary;
    @Column(name = "allowances_json", nullable = false) private String allowancesJson;
    @Column(nullable = false) private boolean insured;
    @Column(name = "tax_method", nullable = false) private String taxMethod;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    public EmploymentContract(UUID employeeId, String number, String type, LocalDate signedOn,
            LocalDate startsOn, LocalDate endsOn, BigDecimal salary, BigDecimal insuranceSalary,
            String allowancesJson, boolean insured, String taxMethod, Instant now) {
        this(employeeId, number, type, signedOn, startsOn, endsOn, salary, insuranceSalary,
                allowancesJson, insured, taxMethod, null, null, now);
    }

    public EmploymentContract(UUID employeeId, String number, String type, LocalDate signedOn,
            LocalDate startsOn, LocalDate endsOn, BigDecimal salary, BigDecimal insuranceSalary,
            String allowancesJson, boolean insured, String taxMethod,
            LocalDate probationStartsOn, LocalDate probationEndsOn, Instant now) {
        this.employeeId = employeeId;
        this.createdAt = now;
        revise(number, type, signedOn, startsOn, endsOn, salary, insuranceSalary, allowancesJson,
                insured, taxMethod, probationStartsOn, probationEndsOn, now);
    }

    public void revise(String number, String type, LocalDate signedOn,
            LocalDate startsOn, LocalDate endsOn, BigDecimal salary, BigDecimal insuranceSalary,
            String allowancesJson, boolean insured, String taxMethod, Instant now) {
        revise(number, type, signedOn, startsOn, endsOn, salary, insuranceSalary, allowancesJson,
                insured, taxMethod, null, null, now);
    }

    public void revise(String number, String type, LocalDate signedOn,
            LocalDate startsOn, LocalDate endsOn, BigDecimal salary, BigDecimal insuranceSalary,
            String allowancesJson, boolean insured, String taxMethod,
            LocalDate probationStartsOn, LocalDate probationEndsOn, Instant now) {
        this.contractNumber = number;
        this.contractType = type;
        this.signedOn = signedOn;
        this.startsOn = startsOn;
        this.endsOn = endsOn;
        this.probationStartsOn = probationStartsOn;
        this.probationEndsOn = probationEndsOn;
        this.baseSalary = salary;
        this.insuranceSalary = insuranceSalary;
        this.allowancesJson = allowancesJson;
        this.insured = insured;
        this.taxMethod = taxMethod;
        this.updatedAt = now;
    }
}
