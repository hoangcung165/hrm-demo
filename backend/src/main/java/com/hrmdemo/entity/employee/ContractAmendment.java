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
@Table(name = "contract_amendment")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ContractAmendment extends LegalEntityOwned {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "contract_id", nullable = false, updatable = false) private UUID contractId;
    @Column(name = "amendment_number", nullable = false) private String amendmentNumber;
    @Column(name = "signed_on", nullable = false) private LocalDate signedOn;
    @Column(name = "effective_on", nullable = false) private LocalDate effectiveOn;
    @Column(nullable = false) private String description;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "base_salary") private BigDecimal baseSalary;
    @Column(name = "insurance_salary") private BigDecimal insuranceSalary;
    @Column(name = "allowances_json") private String allowancesJson;
    @Column private Boolean insured;
    @Column(name = "tax_method") private String taxMethod;
    @Column(name = "override_reason") private String overrideReason;

    public ContractAmendment(UUID contractId, String amendmentNumber, LocalDate signedOn,
            LocalDate effectiveOn, String description, BigDecimal baseSalary, BigDecimal insuranceSalary,
            String allowancesJson, Boolean insured, String taxMethod, String overrideReason, Instant now) {
        this.contractId = contractId;
        this.amendmentNumber = amendmentNumber;
        this.signedOn = signedOn;
        this.effectiveOn = effectiveOn;
        this.description = description;
        this.baseSalary = baseSalary;
        this.insuranceSalary = insuranceSalary;
        this.allowancesJson = allowancesJson;
        this.insured = insured;
        this.taxMethod = taxMethod;
        this.overrideReason = overrideReason;
        this.createdAt = now;
    }
}
