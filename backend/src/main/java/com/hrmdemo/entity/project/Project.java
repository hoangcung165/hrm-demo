package com.hrmdemo.entity.project;

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
 * Dự án: a block of work with dates, one PM and a labour budget. Glossary: docs/contexts/projects/CONTEXT.md.
 * The rules (who may edit, the PM, the unit) live in {@code ProjectService}.
 */
@Entity
@Table(name = "project")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Project extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Mã dự án: typed once, never changed. */
    @Column(nullable = false, updatable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    /** Null for an internal project. */
    private String client;

    /** Code, name and client as {@link SearchText}. */
    @Column(name = "search_text", nullable = false)
    private String searchText;

    @Column(name = "pm_employee_id", nullable = false)
    private UUID pmEmployeeId;

    /** Phòng ban phụ trách. */
    @Column(name = "org_unit_id", nullable = false)
    private UUID orgUnitId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProjectStatus status;

    /** Ngân sách nhân sự in VND, or null. */
    @Column(name = "labor_budget")
    private Long laborBudget;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Project(String code, ProjectDetails details, Instant now) {
        this.code = code;
        this.createdAt = now;
        apply(details, now);
    }

    /** Replaces everything but the code. */
    public void apply(ProjectDetails details, Instant now) {
        this.name = details.name();
        this.client = details.client();
        this.pmEmployeeId = details.pmEmployeeId();
        this.orgUnitId = details.orgUnitId();
        this.startDate = details.startDate();
        this.endDate = details.endDate();
        this.status = details.status();
        this.laborBudget = details.laborBudget();
        this.searchText = SearchText.of(code, details.name(), details.client());
        this.updatedAt = now;
    }

    /** The editable fields of a Dự án, already checked. */
    public record ProjectDetails(String name, String client, UUID pmEmployeeId, UUID orgUnitId, LocalDate startDate,
            LocalDate endDate, ProjectStatus status, Long laborBudget) {
    }
}
