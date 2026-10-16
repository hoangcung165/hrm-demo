package com.hrmdemo.entity.workschedule;

import java.time.DayOfWeek;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.workschedule.WorkDayKind;
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

/** A company's own Lịch làm việc, in place of the default in code. At most one row per Legal entity. */
@Entity
@Table(name = "work_schedule")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkSchedule extends LegalEntityOwned {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkDayKind monday;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkDayKind tuesday;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkDayKind wednesday;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkDayKind thursday;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkDayKind friday;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkDayKind saturday;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkDayKind sunday;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public WorkSchedule(Map<DayOfWeek, WorkDayKind> days, UUID accountId, Instant at) {
        update(days, accountId, at);
    }

    public void update(Map<DayOfWeek, WorkDayKind> days, UUID accountId, Instant at) {
        monday = days.get(DayOfWeek.MONDAY);
        tuesday = days.get(DayOfWeek.TUESDAY);
        wednesday = days.get(DayOfWeek.WEDNESDAY);
        thursday = days.get(DayOfWeek.THURSDAY);
        friday = days.get(DayOfWeek.FRIDAY);
        saturday = days.get(DayOfWeek.SATURDAY);
        sunday = days.get(DayOfWeek.SUNDAY);
        updatedBy = accountId;
        updatedAt = at;
    }

    public Map<DayOfWeek, WorkDayKind> days() {
        Map<DayOfWeek, WorkDayKind> days = new EnumMap<>(DayOfWeek.class);
        days.put(DayOfWeek.MONDAY, monday);
        days.put(DayOfWeek.TUESDAY, tuesday);
        days.put(DayOfWeek.WEDNESDAY, wednesday);
        days.put(DayOfWeek.THURSDAY, thursday);
        days.put(DayOfWeek.FRIDAY, friday);
        days.put(DayOfWeek.SATURDAY, saturday);
        days.put(DayOfWeek.SUNDAY, sunday);
        return days;
    }
}
