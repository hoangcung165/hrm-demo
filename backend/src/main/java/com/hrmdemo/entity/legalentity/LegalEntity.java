package com.hrmdemo.entity.legalentity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Pháp nhân: the company that owns all business data; shown as "Company" in the UI.
 * Glossary: docs/contexts/org/CONTEXT.md. The single row is created by the Flyway migration (ADR 0003),
 * so there is no public constructor.
 */
@Entity
@Table(name = "legal_entity")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LegalEntity {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "tax_code")
    private String taxCode;

    private String address;

    @Column(name = "legal_representative_name")
    private String legalRepresentativeName;

    @Column(name = "legal_representative_title")
    private String legalRepresentativeTitle;

    // The logo columns are written only by LegalEntityRepository queries, together with the image bytes.
    // The bytes are not mapped, so reading company info never loads the image.
    @Column(name = "logo_content_type", insertable = false, updatable = false)
    private String logoContentType;

    @Column(name = "logo_updated_at", insertable = false, updatable = false)
    private Instant logoUpdatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public void updateInfo(String name, String taxCode, String address, String legalRepresentativeName,
            String legalRepresentativeTitle, Instant now) {
        this.name = name;
        this.taxCode = taxCode;
        this.address = address;
        this.legalRepresentativeName = legalRepresentativeName;
        this.legalRepresentativeTitle = legalRepresentativeTitle;
        this.updatedAt = now;
    }

    public boolean hasLogo() {
        return logoContentType != null;
    }
}
