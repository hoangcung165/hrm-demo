package com.hrmdemo.entity.employee;

import java.time.Instant;
import java.time.LocalDate;
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

/** Certificate metadata; the optional private file is stored by EmployeeAttachment. */
@Entity
@Table(name = "employee_certificate")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmployeeCertificate extends LegalEntityOwned {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 150)
    private String issuer;

    @Column(name = "issued_at")
    private LocalDate issuedAt;

    @Column(name = "expires_at")
    private LocalDate expiresAt;

    @Column(name = "attachment_id")
    private UUID attachmentId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public EmployeeCertificate(UUID employeeId, String name, String issuer, LocalDate issuedAt,
            LocalDate expiresAt, UUID attachmentId, Instant now) {
        this.employeeId = employeeId;
        this.createdAt = now;
        edit(name, issuer, issuedAt, expiresAt, attachmentId, now);
    }

    public void edit(String name, String issuer, LocalDate issuedAt, LocalDate expiresAt, UUID attachmentId,
            Instant now) {
        this.name = name;
        this.issuer = issuer;
        this.issuedAt = issuedAt;
        this.expiresAt = expiresAt;
        this.attachmentId = attachmentId;
        this.updatedAt = now;
    }
}
