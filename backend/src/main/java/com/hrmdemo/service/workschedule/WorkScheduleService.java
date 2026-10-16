package com.hrmdemo.service.workschedule;

import java.time.Clock;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.workschedule.WorkDayKind;
import com.hrmdemo.dto.workschedule.WorkScheduleRequest;
import com.hrmdemo.dto.workschedule.WorkScheduleResponse;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.workschedule.WorkSchedule;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.workschedule.WorkScheduleRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lịch làm việc of the company: the default ({@link WorkWeek#DEFAULT}) until the company saves its own. Everyone
 * reads it (the leave form counts days with it); changing it needs {@code COMPANY_EDIT} and is audited. Saving the
 * default removes the company's own row, so it follows the default again.
 */
@Service
@RequiredArgsConstructor
public class WorkScheduleService {

    private final WorkScheduleRepository schedules;
    private final AccessScopeService accessScopes;
    private final AuditRecorder audit;
    private final Clock clock;

    /** The Lịch làm việc in force. */
    @Transactional(readOnly = true)
    public WorkWeek current() {
        return schedules.findFirstBy().map(schedule -> new WorkWeek(schedule.days())).orElse(WorkWeek.DEFAULT);
    }

    @Transactional(readOnly = true)
    public WorkScheduleResponse get(CurrentAccount caller) {
        AccessScope scope = accessScopes.scopeOf(caller);
        return response(schedules.findFirstBy(), scope.has(Permission.COMPANY_EDIT));
    }

    @Transactional
    public WorkScheduleResponse update(CurrentAccount caller, WorkScheduleRequest request) {
        accessScopes.scopeOf(caller).require(Permission.COMPANY_EDIT);
        WorkWeek requested = check(request);
        Optional<WorkSchedule> existing = schedules.findFirstBy();
        WorkWeek before = existing.map(schedule -> new WorkWeek(schedule.days())).orElse(WorkWeek.DEFAULT);
        audit.recordCompanyWide(caller, AuditRegistrations.WORK_SCHEDULE, AuditAction.UPDATE, "Work schedule changed",
                values(before), values(requested));
        if (requested.equals(WorkWeek.DEFAULT)) {
            existing.ifPresent(schedules::delete);
            return response(Optional.empty(), true);
        }
        WorkSchedule schedule = existing.orElse(null);
        if (schedule == null) {
            schedule = new WorkSchedule(requested.days(), caller.id(), clock.instant());
        } else {
            schedule.update(requested.days(), caller.id(), clock.instant());
        }
        return response(Optional.of(schedules.save(schedule)), true);
    }

    /** Every weekday given, and at least one working day. */
    private static WorkWeek check(WorkScheduleRequest request) {
        List<Map<String, String>> errors = new ArrayList<>();
        Map<DayOfWeek, WorkDayKind> days = request == null || request.days() == null ? Map.of() : request.days();
        for (DayOfWeek day : DayOfWeek.values()) {
            if (days.get(day) == null) {
                errors.add(Map.of("field", "days." + day.name(), "code", "required"));
            }
        }
        if (errors.isEmpty() && days.values().stream().allMatch(kind -> kind == WorkDayKind.OFF)) {
            errors.add(Map.of("field", "days", "code", "no_working_day"));
        }
        if (!errors.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request values are invalid")
                    .with("errors", errors);
        }
        return new WorkWeek(days);
    }

    private static Map<String, String> values(WorkWeek week) {
        Map<String, String> values = new LinkedHashMap<>();
        for (DayOfWeek day : DayOfWeek.values()) {
            values.put(day.name().toLowerCase(Locale.ROOT), week.of(day).name());
        }
        return values;
    }

    private static WorkScheduleResponse response(Optional<WorkSchedule> schedule, boolean canEdit) {
        WorkWeek week = schedule.map(s -> new WorkWeek(s.days())).orElse(WorkWeek.DEFAULT);
        Map<DayOfWeek, WorkDayKind> days = new LinkedHashMap<>();
        for (DayOfWeek day : DayOfWeek.values()) {
            days.put(day, week.of(day));
        }
        return new WorkScheduleResponse(days, schedule.isPresent(), canEdit,
                schedule.map(WorkSchedule::getUpdatedAt).orElse(null));
    }
}
