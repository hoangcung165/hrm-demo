package com.hrmdemo.entity.leave;

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

/** Loại nghỉ. Its rules are the versions of its {@link LeavePolicy}. Never deleted: an unused type is deactivated. */
@Entity
@Table(name = "leave_type")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LeaveType extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, updatable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public LeaveType(String code, String name, int sortOrder, Instant now) {
        this.code = code;
        this.name = name;
        this.sortOrder = sortOrder;
        this.active = true;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void update(String newName, boolean newActive, int newSortOrder, Instant now) {
        name = newName;
        active = newActive;
        sortOrder = newSortOrder;
        updatedAt = now;
    }
}
