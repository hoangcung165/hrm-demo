package com.hrmdemo.entity.orgunit;

import java.time.Instant;
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

/**
 * Đơn vị tổ chức: one node of the org tree of the Pháp nhân (branch, department, team).
 * Glossary: docs/contexts/org/CONTEXT.md. The company itself is not a unit: a unit without a parent sits
 * directly under the Legal entity. The rules (move, delete, deactivate) live in {@code OrgUnitService}.
 */
@Entity
@Table(name = "org_unit")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrgUnit extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Null when the unit sits directly under the company. */
    @Column(name = "parent_id")
    private UUID parentId;

    /** Upper case, unique within the Legal entity. */
    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrgUnitType type;

    /** Trưởng đơn vị: an Employee id, or null while the position is vacant. */
    @Column(name = "head_employee_id")
    private UUID headEmployeeId;

    /** Ca mặc định (HRM-22): the shift its Employees work on working days without a Phân ca of their own. */
    @Column(name = "default_shift_id")
    private UUID defaultShiftId;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** A new unit starts active. */
    public OrgUnit(UUID parentId, String code, String name, OrgUnitType type, UUID headEmployeeId, int sortOrder,
            Instant now) {
        this.parentId = parentId;
        this.code = code;
        this.name = name;
        this.type = type;
        this.headEmployeeId = headEmployeeId;
        this.active = true;
        this.sortOrder = sortOrder;
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** Edits the unit's own details; the parent and the status change through their own operations. */
    public void update(String name, String code, OrgUnitType type, UUID headEmployeeId, Instant now) {
        this.name = name;
        this.code = code;
        this.type = type;
        this.headEmployeeId = headEmployeeId;
        this.updatedAt = now;
    }

    public void moveTo(UUID newParentId, int newSortOrder, Instant now) {
        this.parentId = newParentId;
        this.sortOrder = newSortOrder;
        this.updatedAt = now;
    }

    public void setDefaultShift(UUID shiftId, Instant now) {
        this.defaultShiftId = shiftId;
        this.updatedAt = now;
    }

    public void deactivate(Instant now) {
        this.active = false;
        this.updatedAt = now;
    }

    public void reactivate(Instant now) {
        this.active = true;
        this.updatedAt = now;
    }
}
