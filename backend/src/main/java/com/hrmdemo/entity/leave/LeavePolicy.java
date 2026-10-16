package com.hrmdemo.entity.leave;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.hrmdemo.dto.leave.LeaveAccrual;
import com.hrmdemo.dto.leave.LeavePay;
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
 * One version of the Chính sách phép of a {@link LeaveType}, in force from {@code effectiveFrom} until the next one.
 * Saving a policy on a date that already has a version replaces that version's values; any other date adds one.
 */
@Entity
@Table(name = "leave_policy")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LeavePolicy extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "leave_type_id", nullable = false, updatable = false)
    private UUID leaveTypeId;

    @Column(name = "effective_from", nullable = false, updatable = false)
    private LocalDate effectiveFrom;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeavePay pay;

    @Column(name = "half_day_allowed", nullable = false)
    private boolean halfDayAllowed;

    @Column(name = "attachment_required", nullable = false)
    private boolean attachmentRequired;

    @Column(nullable = false)
    private boolean limited;

    @Column(name = "entitlement_days")
    private BigDecimal entitlementDays;

    @Column(name = "seniority_step_years")
    private Integer seniorityStepYears;

    @Enumerated(EnumType.STRING)
    private LeaveAccrual accrual;

    @Column(name = "cut_off_day", nullable = false)
    private int cutOffDay;

    @Column(name = "advance_allowed", nullable = false)
    private boolean advanceAllowed;

    @Column(name = "max_days_per_request")
    private BigDecimal maxDaysPerRequest;

    @Column(name = "carry_over_max_days")
    private BigDecimal carryOverMaxDays;

    /** MM-DD of the next year. */
    @Column(name = "carry_over_expiry")
    private String carryOverExpiry;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /** The Account that saved this version; null for the defaults. */
    @Column(name = "created_by")
    private UUID createdBy;

    public LeavePolicy(UUID leaveTypeId, LocalDate effectiveFrom, Values values, UUID accountId, Instant now) {
        this.leaveTypeId = leaveTypeId;
        this.effectiveFrom = effectiveFrom;
        replace(values, accountId, now);
    }

    /** The values of a version, as one record for the service. */
    public record Values(LeavePay pay, boolean halfDayAllowed, boolean attachmentRequired, boolean limited,
            BigDecimal entitlementDays, Integer seniorityStepYears, LeaveAccrual accrual, int cutOffDay,
            boolean advanceAllowed, BigDecimal maxDaysPerRequest, BigDecimal carryOverMaxDays,
            String carryOverExpiry) {
    }

    public void replace(Values values, UUID accountId, Instant now) {
        pay = values.pay();
        halfDayAllowed = values.halfDayAllowed();
        attachmentRequired = values.attachmentRequired();
        limited = values.limited();
        entitlementDays = values.entitlementDays();
        seniorityStepYears = values.seniorityStepYears();
        accrual = values.accrual();
        cutOffDay = values.cutOffDay();
        advanceAllowed = values.advanceAllowed();
        maxDaysPerRequest = values.maxDaysPerRequest();
        carryOverMaxDays = values.carryOverMaxDays();
        carryOverExpiry = values.carryOverExpiry();
        createdBy = accountId;
        createdAt = now;
    }

    public Values values() {
        return new Values(pay, halfDayAllowed, attachmentRequired, limited, entitlementDays, seniorityStepYears,
                accrual, cutOffDay, advanceAllowed, maxDaysPerRequest, carryOverMaxDays, carryOverExpiry);
    }
}
