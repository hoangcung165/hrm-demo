package com.hrmdemo.entity.employee;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Passport, visa or work permit metadata; binary attachments are implemented separately in HRM-08/BE-3. */
@Entity
@Table(name = "employee_expat_document")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmployeeExpatDocument extends LegalEntityOwned {
    public enum Type { PASSPORT, VISA, WORK_PERMIT }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false)
    private Type documentType;

    @Column(name = "document_number", nullable = false)
    private String documentNumber;

    @Column(name = "issuing_country", nullable = false)
    private String issuingCountry;

    @Column(name = "issued_at")
    private LocalDate issuedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDate expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public EmployeeExpatDocument(UUID employeeId, Type type, String number, String country,
            LocalDate issuedAt, LocalDate expiresAt, Instant now) {
        this.employeeId = employeeId;
        this.createdAt = now;
        edit(type, number, country, issuedAt, expiresAt, now);
    }

    public void edit(Type type, String number, String country, LocalDate issuedAt, LocalDate expiresAt, Instant now) {
        this.documentType = type;
        this.documentNumber = number;
        this.issuingCountry = country;
        this.issuedAt = issuedAt;
        this.expiresAt = expiresAt;
        this.updatedAt = now;
    }
}
