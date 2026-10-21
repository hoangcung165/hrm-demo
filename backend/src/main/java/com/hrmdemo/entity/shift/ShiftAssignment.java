package com.hrmdemo.entity.shift;

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
 * Phân ca: the Ca làm việc an Employee works on a day. At most one per Employee per day (unique key). A shift that
 * crosses midnight is stored on the day it starts. Rows are written by a native upsert in
 * {@code ShiftAssignmentRepository}, so this class is mostly for reading.
 */
@Entity
@Table(name = "shift_assignment")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ShiftAssignment extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(name = "work_date", nullable = false, updatable = false)
    private LocalDate workDate;

    @Column(name = "shift_id", nullable = false)
    private UUID shiftId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
