package com.hrmdemo.entity.employee;

import java.time.Instant;
import java.util.UUID;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Employee payout bank account. Never expose the full account number without a sensitive-data check. */
@Entity
@Table(name = "employee_bank_account")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmployeeBankAccount extends LegalEntityOwned {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(name = "bank_name", nullable = false)
    private String bankName;

    @Column(name = "account_number", nullable = false)
    private String accountNumber;

    @Column(name = "account_holder", nullable = false)
    private String accountHolder;

    @Column(name = "is_default", nullable = false)
    private boolean defaultAccount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public EmployeeBankAccount(UUID employeeId, String bankName, String accountNumber, String accountHolder,
            boolean defaultAccount, Instant now) {
        this.employeeId = employeeId;
        this.createdAt = now;
        edit(bankName, accountNumber, accountHolder, now);
        this.defaultAccount = defaultAccount;
    }

    public void edit(String bankName, String accountNumber, String accountHolder, Instant now) {
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.accountHolder = accountHolder;
        this.updatedAt = now;
    }

    public void setDefaultAccount(boolean value, Instant now) {
        defaultAccount = value;
        updatedAt = now;
    }
}
