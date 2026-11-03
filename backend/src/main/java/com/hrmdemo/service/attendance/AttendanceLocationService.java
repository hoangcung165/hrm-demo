package com.hrmdemo.service.attendance;

import java.time.Clock;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.attendance.AttendanceLocationRequest;
import com.hrmdemo.dto.attendance.AttendanceLocationResponse;
import com.hrmdemo.entity.attendance.AttendanceLocation;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.attendance.AttendanceLocationRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Địa điểm chấm công of the company (HRM-39). Everything here needs {@link Permission#ATTENDANCE_LOCATION_EDIT}:
 * the places are a settings page; checking in from the phone reads them without it. Never deleted, only made
 * inactive. Every change is audited; none changes a stored punch.
 */
@Service
@RequiredArgsConstructor
public class AttendanceLocationService {

    static final int MAX_NAME = 100;
    static final int MAX_ADDRESS = 255;

    private final AttendanceLocationRepository locations;
    private final AccessScopeService accessScopes;
    private final AuditRecorder audit;
    private final Clock clock;

    /** The places by name; {@code active} limits them to those on or off. */
    @Transactional(readOnly = true)
    public List<AttendanceLocationResponse> list(CurrentAccount caller, Boolean active) {
        accessScopes.scopeOf(caller).require(Permission.ATTENDANCE_LOCATION_EDIT);
        List<AttendanceLocation> found = active == null ? locations.findAllByOrderByNameAsc()
                : locations.findAllByActiveOrderByNameAsc(active);
        return found.stream().map(AttendanceLocationService::response).toList();
    }

    @Transactional(readOnly = true)
    public AttendanceLocationResponse get(CurrentAccount caller, UUID id) {
        accessScopes.scopeOf(caller).require(Permission.ATTENDANCE_LOCATION_EDIT);
        return response(find(id));
    }

    @Transactional
    public AttendanceLocationResponse create(CurrentAccount caller, AttendanceLocationRequest request) {
        accessScopes.scopeOf(caller).require(Permission.ATTENDANCE_LOCATION_EDIT);
        Checked checked = check(request, null);
        AttendanceLocation location = locations.save(new AttendanceLocation(checked.name(), checked.address(),
                request.latitude(), request.longitude(), request.radiusMeters(), clock.instant()));
        audit.record(caller, AuditRegistrations.ATTENDANCE_LOCATION, location.getId(), AuditAction.CREATE,
                "Check-in location " + location.getName() + " added", null, values(location));
        return response(location);
    }

    /** Saves the place; the punches already stored keep their distance and marks. */
    @Transactional
    public AttendanceLocationResponse update(CurrentAccount caller, UUID id, AttendanceLocationRequest request) {
        accessScopes.scopeOf(caller).require(Permission.ATTENDANCE_LOCATION_EDIT);
        AttendanceLocation location = find(id);
        Checked checked = check(request, id);
        Map<String, Object> before = values(location);
        location.update(checked.name(), checked.address(), request.latitude(), request.longitude(),
                request.radiusMeters(), clock.instant());
        audit.record(caller, AuditRegistrations.ATTENDANCE_LOCATION, location.getId(), AuditAction.UPDATE,
                "Check-in location " + location.getName() + " changed", before, values(location));
        return response(location);
    }

    @Transactional
    public AttendanceLocationResponse deactivate(CurrentAccount caller, UUID id) {
        return setActive(caller, id, false, "made inactive");
    }

    @Transactional
    public AttendanceLocationResponse reactivate(CurrentAccount caller, UUID id) {
        return setActive(caller, id, true, "made active");
    }

    private AttendanceLocationResponse setActive(CurrentAccount caller, UUID id, boolean active, String what) {
        accessScopes.scopeOf(caller).require(Permission.ATTENDANCE_LOCATION_EDIT);
        AttendanceLocation location = find(id);
        Map<String, Object> before = values(location);
        location.setActive(active, clock.instant());
        audit.record(caller, AuditRegistrations.ATTENDANCE_LOCATION, location.getId(), AuditAction.UPDATE,
                "Check-in location " + location.getName() + " " + what, before, values(location));
        return response(location);
    }

    private record Checked(String name, String address) {
    }

    /** Checks every field at once and throws them together; {@code id} is the place being saved, null when adding. */
    private Checked check(AttendanceLocationRequest request, UUID id) {
        List<Map<String, String>> errors = new ArrayList<>();
        if (request == null) {
            request = new AttendanceLocationRequest(null, null, null, null, null);
        }
        String name = request.name() == null ? "" : request.name().strip();
        if (name.isEmpty()) {
            errors.add(error("name", "required"));
        } else if (name.length() > MAX_NAME) {
            errors.add(error("name", "too_long"));
        } else if (id == null ? locations.existsByNameIgnoreCase(name)
                : locations.existsByNameIgnoreCaseAndIdNot(name, id)) {
            errors.add(error("name", "taken"));
        }
        String address = request.address() == null || request.address().isBlank() ? null : request.address().strip();
        if (address != null && address.length() > MAX_ADDRESS) {
            errors.add(error("address", "too_long"));
        }
        coordinate("latitude", request.latitude(), 90, errors);
        coordinate("longitude", request.longitude(), 180, errors);
        Integer radius = request.radiusMeters();
        if (radius == null) {
            errors.add(error("radiusMeters", "required"));
        } else if (radius < AttendanceLocation.MIN_RADIUS_METERS || radius > AttendanceLocation.MAX_RADIUS_METERS) {
            errors.add(error("radiusMeters", "out_of_range"));
        }
        if (!errors.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request values are invalid")
                    .with("errors", errors);
        }
        return new Checked(name, address);
    }

    private static void coordinate(String field, Double value, double limit, List<Map<String, String>> errors) {
        if (value == null) {
            errors.add(error(field, "required"));
        } else if (value.isNaN() || value < -limit || value > limit) {
            errors.add(error(field, "out_of_range"));
        }
    }

    private AttendanceLocation find(UUID id) {
        return locations.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                "attendance_location.not_found", "No such check-in location"));
    }

    static AttendanceLocationResponse response(AttendanceLocation location) {
        return new AttendanceLocationResponse(location.getId(), location.getName(), location.getAddress(),
                location.getLatitude(), location.getLongitude(), location.getRadiusMeters(), location.isActive(),
                location.getCreatedAt(), location.getUpdatedAt());
    }

    private static Map<String, Object> values(AttendanceLocation location) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("name", location.getName());
        values.put("address", location.getAddress());
        values.put("latitude", location.getLatitude());
        values.put("longitude", location.getLongitude());
        values.put("radiusMeters", location.getRadiusMeters());
        values.put("active", location.isActive());
        return values;
    }

    private static Map<String, String> error(String field, String code) {
        return Map.of("field", field, "code", code);
    }
}
