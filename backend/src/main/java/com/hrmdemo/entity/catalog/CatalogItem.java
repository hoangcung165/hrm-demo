package com.hrmdemo.entity.catalog;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.entity.LegalEntityOwned;
import com.hrmdemo.entity.SearchText;
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

/**
 * One item of a Danh mục (catalog). The typed fields belong to one catalog each and are null on the others;
 * the service checks which ones a catalog takes, and the table checks it again. Glossary:
 * docs/contexts/org/CONTEXT.md.
 */
@Entity
@Table(name = "catalog_item")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CatalogItem extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private Catalog catalog;

    /** Upper case, unique within the catalog; null for holidays. */
    private String code;

    @Column(nullable = false)
    private String name;

    /** The name as {@link SearchText} keeps it; also what makes two names "the same". */
    @Column(name = "search_text", nullable = false)
    private String searchText;

    @Column(nullable = false)
    private boolean active;

    @Enumerated(EnumType.STRING)
    private ContractTerm term;

    @Column(name = "max_months")
    private Integer maxMonths;

    private Boolean insurable;

    private Boolean taxable;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** A new item is active. */
    public CatalogItem(Catalog catalog, CatalogItemFields fields, Instant now) {
        this.catalog = catalog;
        this.active = true;
        this.createdAt = now;
        apply(fields, now);
    }

    /** Replaces every field the catalog takes; the status does not change. */
    public void update(CatalogItemFields fields, Instant now) {
        apply(fields, now);
    }

    public void deactivate(Instant now) {
        this.active = false;
        this.updatedAt = now;
    }

    public void reactivate(Instant now) {
        this.active = true;
        this.updatedAt = now;
    }

    private void apply(CatalogItemFields fields, Instant now) {
        this.code = fields.code();
        this.name = fields.name();
        this.searchText = SearchText.of(fields.name());
        this.term = fields.term();
        this.maxMonths = fields.maxMonths();
        this.insurable = fields.insurable();
        this.taxable = fields.taxable();
        this.startDate = fields.startDate();
        this.endDate = fields.endDate();
        this.updatedAt = now;
    }
}
