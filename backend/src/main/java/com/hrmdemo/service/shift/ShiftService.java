package com.hrmdemo.service.shift;

import java.time.Clock;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.shift.ShiftRequest;
import com.hrmdemo.dto.shift.ShiftResponse;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.shift.RoundingMode;
import com.hrmdemo.entity.shift.Shift;
import com.hrmdemo.entity.shift.ShiftPattern;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.shift.ShiftRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ca làm việc of the company. Reading needs SHIFT_VIEW, adding, changing, turning on and off needs SHIFT_EDIT.
 * Shifts are never deleted. Every change is audited.
 */
@Service
@RequiredArgsConstructor
public class ShiftService {

    private static final Pattern CODE = Pattern.compile("[A-Za-z0-9_-]{1,20}");
    private static final Set<Integer> ROUNDING_STEPS = Set.of(5, 10, 15, 30);
    private static final int MAX_TOLERANCE = 120;

    private final ShiftRepository shifts;
    private final AccessScopeService accessScopes;
    private final AuditRecorder audit;
    private final Clock clock;

    /** The shifts, earliest start first; {@code active} limits them to those on or off. */
    @Transactional(readOnly = true)
    public List<ShiftResponse> list(CurrentAccount caller, Boolean active) {
        accessScopes.scopeOf(caller).require(Permission.SHIFT_VIEW);
        List<Shift> found = active == null ? shifts.findAllByOrderByStartTimeAscNameAsc()
                : shifts.findAllByActiveOrderByStartTimeAscNameAsc(active);
        return found.stream().map(ShiftService::response).toList();
    }

    @Transactional(readOnly = true)
    public ShiftResponse get(CurrentAccount caller, UUID id) {
        accessScopes.scopeOf(caller).require(Permission.SHIFT_VIEW);
        return response(find(id));
    }

    @Transactional
    public ShiftResponse create(CurrentAccount caller, ShiftRequest request) {
        accessScopes.scopeOf(caller).require(Permission.SHIFT_EDIT);
        List<Map<String, String>> errors = new ArrayList<>();
        String code = request == null || request.code() == null ? "" : request.code().strip();
        if (!CODE.matcher(code).matches()) {
            errors.add(error("code", code.isEmpty() ? "required" : "invalid"));
        } else if (shifts.existsByCodeIgnoreCase(code)) {
            errors.add(error("code", "taken"));
        }
        ShiftPattern pattern = pattern(request, errors);
        throwIfAny(errors);
        Shift shift = shifts.save(new Shift(code.toUpperCase(Locale.ROOT), pattern, clock.instant()));
        audit.record(caller, AuditRegistrations.SHIFT, shift.getId(), AuditAction.CREATE,
                "Shift " + shift.getCode() + " added", null, values(shift));
        return response(shift);
    }

    @Transactional
    public ShiftResponse update(CurrentAccount caller, UUID id, ShiftRequest request) {
        accessScopes.scopeOf(caller).require(Permission.SHIFT_EDIT);
        Shift shift = find(id);
        List<Map<String, String>> errors = new ArrayList<>();
        ShiftPattern pattern = pattern(request, errors);
        throwIfAny(errors);
        Map<String, Object> before = values(shift);
        shift.update(pattern, clock.instant());
        audit.record(caller, AuditRegistrations.SHIFT, shift.getId(), AuditAction.UPDATE,
                "Shift " + shift.getCode() + " changed", before, values(shift));
        return response(shift);
    }

    @Transactional
    public ShiftResponse deactivate(CurrentAccount caller, UUID id) {
        return setActive(caller, id, false, "turned off");
    }

    @Transactional
    public ShiftResponse reactivate(CurrentAccount caller, UUID id) {
        return setActive(caller, id, true, "turned on");
    }

    private ShiftResponse setActive(CurrentAccount caller, UUID id, boolean active, String what) {
        accessScopes.scopeOf(caller).require(Permission.SHIFT_EDIT);
        Shift shift = find(id);
        Map<String, Object> before = values(shift);
        shift.setActive(active, clock.instant());
        audit.record(caller, AuditRegistrations.SHIFT, shift.getId(), AuditAction.UPDATE,
                "Shift " + shift.getCode() + " " + what, before, values(shift));
        return response(shift);
    }

    /** Checks every field and returns the pattern; the errors are collected rather than thrown one by one. */
    static ShiftPattern pattern(ShiftRequest request, List<Map<String, String>> errors) {
        if (request == null) {
            errors.add(error("name", "required"));
            return null;
        }
        String name = request.name() == null ? "" : request.name().strip();
        if (name.isEmpty()) {
            errors.add(error("name", "required"));
        } else if (name.length() > 100) {
            errors.add(error("name", "too_long"));
        }
        if (request.startTime() == null) {
            errors.add(error("startTime", "required"));
        }
        if (request.endTime() == null) {
            errors.add(error("endTime", "required"));
        } else if (request.endTime().equals(request.startTime())) {
            errors.add(error("endTime", "same_as_start"));
        }
        if ((request.breakStart() == null) != (request.breakEnd() == null)) {
            errors.add(error(request.breakStart() == null ? "breakStart" : "breakEnd", "required"));
        }
        tolerance("lateToleranceMinutes", request.lateToleranceMinutes(), errors);
        tolerance("earlyToleranceMinutes", request.earlyToleranceMinutes(), errors);
        RoundingMode mode = roundingMode(request, errors);
        if (!errors.isEmpty()) {
            return null;
        }
        ShiftPattern pattern = new ShiftPattern(name, request.startTime(), request.endTime(), request.breakStart(),
                request.breakEnd(), request.lateToleranceMinutes(), request.earlyToleranceMinutes(), mode,
                mode == RoundingMode.NONE ? null : request.roundingMinutes());
        if (request.breakStart() != null && !pattern.breakInsideShift()) {
            errors.add(error("breakStart", request.breakStart().equals(request.breakEnd()) ? "empty" : "outside_shift"));
            return null;
        }
        return pattern;
    }

    private static void tolerance(String field, Integer minutes, List<Map<String, String>> errors) {
        if (minutes == null) {
            errors.add(error(field, "required"));
        } else if (minutes < 0 || minutes > MAX_TOLERANCE) {
            errors.add(error(field, "out_of_range"));
        }
    }

    private static RoundingMode roundingMode(ShiftRequest request, List<Map<String, String>> errors) {
        RoundingMode mode = null;
        if (request.roundingMode() == null || request.roundingMode().isBlank()) {
            errors.add(error("roundingMode", "required"));
        } else {
            try {
                mode = RoundingMode.valueOf(request.roundingMode().strip().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                errors.add(error("roundingMode", "invalid"));
            }
        }
        if (mode != null && mode != RoundingMode.NONE) {
            Integer step = request.roundingMinutes();
            if (step == null) {
                errors.add(error("roundingMinutes", "required"));
            } else if (!ROUNDING_STEPS.contains(step)) {
                errors.add(error("roundingMinutes", "invalid"));
            }
        }
        return mode;
    }

    private Shift find(UUID id) {
        return shifts.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "shift.not_found",
                "No such shift"));
    }

    private static ShiftResponse response(Shift shift) {
        ShiftPattern pattern = shift.pattern();
        return new ShiftResponse(shift.getId(), shift.getCode(), shift.getName(), shift.getStartTime(),
                shift.getEndTime(), shift.getBreakStart(), shift.getBreakEnd(), shift.getLateToleranceMinutes(),
                shift.getEarlyToleranceMinutes(), shift.getRoundingMode().name(), shift.getRoundingMinutes(),
                shift.isActive(), pattern.crossesMidnight(), pattern.scheduledMinutes(), pattern.nightMinutes());
    }

    private static Map<String, Object> values(Shift shift) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("code", shift.getCode());
        values.put("name", shift.getName());
        values.put("startTime", shift.getStartTime().toString());
        values.put("endTime", shift.getEndTime().toString());
        values.put("breakStart", shift.getBreakStart() == null ? null : shift.getBreakStart().toString());
        values.put("breakEnd", shift.getBreakEnd() == null ? null : shift.getBreakEnd().toString());
        values.put("lateToleranceMinutes", shift.getLateToleranceMinutes());
        values.put("earlyToleranceMinutes", shift.getEarlyToleranceMinutes());
        values.put("roundingMode", shift.getRoundingMode().name());
        values.put("roundingMinutes", shift.getRoundingMinutes());
        values.put("active", shift.isActive());
        return values;
    }

    private static Map<String, String> error(String field, String code) {
        return Map.of("field", field, "code", code);
    }

    private static void throwIfAny(List<Map<String, String>> errors) {
        if (!errors.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request values are invalid")
                    .with("errors", errors);
        }
    }
}
