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

/** One catalog skill and proficiency level on an Employee profile. */
@Entity
@Table(name = "employee_skill")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmployeeSkill extends LegalEntityOwned {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(name = "skill_id", nullable = false)
    private UUID skillId;

    @Column(nullable = false)
    private int level;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public EmployeeSkill(UUID employeeId, UUID skillId, int level, Instant now) {
        this.employeeId = employeeId;
        this.createdAt = now;
        edit(skillId, level, now);
    }

    public void edit(UUID skillId, int level, Instant now) {
        this.skillId = skillId;
        this.level = level;
        this.updatedAt = now;
    }
}
