package com.hrmdemo.entity.leave;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.hrmdemo.dto.leave.DayPart;
import com.hrmdemo.dto.leave.LeaveDayKind;
import com.hrmdemo.dto.leave.LeaveRequestStatus;
import com.hrmdemo.entity.LegalEntityOwned;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Đơn nghỉ: the content of a Yêu cầu phê duyệt of type LEAVE, under the same id, with every day as it was counted
 * when it was sent (or sent again).
 */
@Entity
@Table(name = "leave_request")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LeaveRequest extends LegalEntityOwned {

    @Id
    private UUID id;

    @Column(name = "employee_id", nullable = false, updatable = false)
    private UUID employeeId;

    @Column(name = "leave_type_id", nullable = false)
    private UUID leaveTypeId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "start_part", nullable = false)
    private DayPart startPart;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "end_part", nullable = false)
    private DayPart endPart;

    @Column(nullable = false)
    private BigDecimal days;

    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeaveRequestStatus status;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "leave_request_day", joinColumns = @JoinColumn(name = "request_id"))
    @OrderBy("day")
    private List<Day> dayList = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "leave_request_cc", joinColumns = @JoinColumn(name = "request_id"))
    @Column(name = "employee_id", nullable = false)
    private Set<UUID> cc = new LinkedHashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** What a request asks for: its type, its days, why and whom to copy. */
    public record Content(UUID leaveTypeId, LocalDate startDate, DayPart startPart, LocalDate endDate,
            DayPart endPart, BigDecimal days, String reason, List<Day> dayList, Set<UUID> cc) {
    }

    public LeaveRequest(UUID id, UUID employeeId, Content content, Instant now) {
        this.id = id;
        this.employeeId = employeeId;
        this.status = LeaveRequestStatus.PENDING;
        this.createdAt = now;
        replace(content, now);
    }

    /** The sender's new content while the request was returned to them. */
    public void replace(Content content, Instant now) {
        leaveTypeId = content.leaveTypeId();
        startDate = content.startDate();
        startPart = content.startPart();
        endDate = content.endDate();
        endPart = content.endPart();
        days = content.days();
        reason = content.reason();
        dayList.clear();
        dayList.addAll(content.dayList());
        cc.clear();
        cc.addAll(content.cc());
        updatedAt = now;
    }

    /** Follows the Yêu cầu phê duyệt (approved, rejected, returned, sent again, cancelled while waiting). */
    public void follow(LeaveRequestStatus newStatus, Instant now) {
        status = newStatus;
        if (newStatus == LeaveRequestStatus.CANCELLED) {
            cancelledAt = now;
        }
        updatedAt = now;
    }

    /** The sender takes back an approved request before it starts: the days go back to the balance. */
    public void cancelApproved(Instant now) {
        follow(LeaveRequestStatus.CANCELLED, now);
    }

    @Embeddable
    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class Day {

        @Column(nullable = false)
        private LocalDate day;

        @Enumerated(EnumType.STRING)
        @Column(nullable = false)
        private LeaveDayKind kind;

        @Column(nullable = false)
        private boolean morning;

        @Column(nullable = false)
        private boolean afternoon;

        @Column(nullable = false)
        private BigDecimal value;

        public Day(LocalDate day, LeaveDayKind kind, boolean morning, boolean afternoon, BigDecimal value) {
            this.day = day;
            this.kind = kind;
            this.morning = morning;
            this.afternoon = afternoon;
            this.value = value;
        }
    }
}
