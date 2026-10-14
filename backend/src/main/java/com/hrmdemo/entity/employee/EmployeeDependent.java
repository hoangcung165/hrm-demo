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

/** Tax dependent with an explicit inclusive effective-date period. */
@Entity
@Table(name = "employee_dependent")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmployeeDependent extends LegalEntityOwned {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "relationship", nullable = false)
    private String relationship;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public EmployeeDependent(UUID employeeId, String fullName, String relationship, LocalDate dateOfBirth,
            LocalDate effectiveFrom, LocalDate effectiveTo, Instant now) {
        this.employeeId = employeeId;
        this.createdAt = now;
        edit(fullName, relationship, dateOfBirth, effectiveFrom, effectiveTo, now);
    }

    public void edit(String fullName, String relationship, LocalDate dateOfBirth,
            LocalDate effectiveFrom, LocalDate effectiveTo, Instant now) {
        this.fullName = fullName;
        this.relationship = relationship;
        this.dateOfBirth = dateOfBirth;
        this.effectiveFrom = effectiveFrom;
        this.effectiveTo = effectiveTo;
        this.updatedAt = now;
    }
}
