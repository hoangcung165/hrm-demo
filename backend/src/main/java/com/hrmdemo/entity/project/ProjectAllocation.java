package com.hrmdemo.entity.project;

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

/**
 * Phân bổ: an Employee gives {@code percent} of their working time to a Dự án on every day from {@code startDate} to
 * {@code endDate}, both included. Glossary: docs/contexts/projects/CONTEXT.md. The rules live in
 * {@code AllocationService}. The Employee never changes: another person is another allocation.
 */
@Entity
@Table(name = "project_allocation")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectAllocation extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "project_id", nullable = false, updatable = false)
    private UUID projectId;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    /** Vai trò dự án, an item of the PROJECT_ROLE catalog. */
    @Column(name = "project_role_id", nullable = false)
    private UUID projectRoleId;

    @Column(nullable = false)
    private int percent;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ProjectAllocation(UUID projectId, UUID employeeId, UUID projectRoleId, int percent, LocalDate startDate,
            LocalDate endDate, Instant now) {
        this.projectId = projectId;
        this.employeeId = employeeId;
        this.createdAt = now;
        change(projectRoleId, percent, startDate, endDate, now);
    }

    public void change(UUID projectRoleId, int percent, LocalDate startDate, LocalDate endDate, Instant now) {
        this.projectRoleId = projectRoleId;
        this.percent = percent;
        this.startDate = startDate;
        this.endDate = endDate;
        this.updatedAt = now;
    }

    /** Moves the dates only (end early, or cut to the project's dates). */
    public void moveDates(LocalDate startDate, LocalDate endDate, Instant now) {
        this.startDate = startDate;
        this.endDate = endDate;
        this.updatedAt = now;
    }
}
