package com.hrmdemo.entity.attendance;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.dto.attendance.AttendanceAdjustmentStatus;
import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Đơn bổ sung công (HRM-24): the time(s) an Employee forgot to punch on one day of their Công theo ngày. Its id is
 * the id of its Yêu cầu phê duyệt, whose status it follows. {@code timeIn} and {@code timeOut} fill only a side that
 * had no punch when it was sent; at least one is set.
 */
@Entity
@Table(name = "attendance_adjustment")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AttendanceAdjustment extends LegalEntityOwned {

    @Id
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(name = "work_date", nullable = false, updatable = false)
    private LocalDate workDate;

    @Column(name = "time_in")
    private Instant timeIn;

    @Column(name = "time_out")
    private Instant timeOut;

    @Column(nullable = false)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceAdjustmentStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public AttendanceAdjustment(UUID id, UUID employeeId, LocalDate workDate, Instant timeIn, Instant timeOut,
            String reason, Instant now) {
        this.id = id;
        this.employeeId = employeeId;
        this.workDate = workDate;
        this.timeIn = timeIn;
        this.timeOut = timeOut;
        this.reason = reason;
        this.status = AttendanceAdjustmentStatus.PENDING;
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** New times and reason of a returned request, sent again by its sender. */
    public void replace(Instant timeIn, Instant timeOut, String reason, Instant now) {
        this.timeIn = timeIn;
        this.timeOut = timeOut;
        this.reason = reason;
        this.updatedAt = now;
    }

    public void follow(AttendanceAdjustmentStatus next, Instant at) {
        this.status = next;
        this.updatedAt = at;
    }
}
