package com.hrmdemo.entity.attendance;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Công thủ công: the result of one Employee's day entered by the timekeeper (HRM-24). At most one per Employee and day
 * (unique key). {@code kind} is FULL, HALF, ABSENT or TIMES; In and Out are set for TIMES only, stored as minutes after
 * midnight so no time zone conversion touches them, and an Out at or before the In is on the next calendar day (a shift
 * that crosses midnight). Rows are written by a
 * native upsert in {@code ManualAttendanceService}, so this class is for reading.
 */
@Entity
@Table(name = "manual_attendance")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ManualAttendance extends LegalEntityOwned {

    @Id
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(name = "work_date", nullable = false, updatable = false)
    private LocalDate workDate;

    @Column(nullable = false)
    private String kind;

    @Column(name = "minute_in")
    private Integer minuteIn;

    @Column(name = "minute_out")
    private Integer minuteOut;

    private String note;

    @Column(name = "entered_by", nullable = false)
    private UUID enteredBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** The In of a TIMES entry, else null. */
    public LocalTime getTimeIn() {
        return minuteIn == null ? null : LocalTime.ofSecondOfDay(minuteIn * 60L);
    }

    /** The Out of a TIMES entry, else null. */
    public LocalTime getTimeOut() {
        return minuteOut == null ? null : LocalTime.ofSecondOfDay(minuteOut * 60L);
    }
}
