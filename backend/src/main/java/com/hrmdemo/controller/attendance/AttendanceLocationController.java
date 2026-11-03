package com.hrmdemo.controller.attendance;

import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.attendance.AttendanceLocationRequest;
import com.hrmdemo.dto.attendance.AttendanceLocationResponse;
import com.hrmdemo.dto.attendance.MobileCheckinSettingsRequest;
import com.hrmdemo.dto.attendance.MobileCheckinSettingsResponse;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.attendance.AttendanceLocationService;
import com.hrmdemo.service.attendance.MobileCheckinSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Địa điểm chấm công and the rules of mobile check-in (HRM-39). Everything needs ATTENDANCE_LOCATION_EDIT. A place is
 * never deleted, only made inactive.
 */
@RestController
@RequiredArgsConstructor
public class AttendanceLocationController {

    private final AttendanceLocationService locations;
    private final MobileCheckinSettingsService settings;

    @GetMapping("/api/attendance/locations")
    @Operation(summary = "The check-in locations by name; active=true or false limits them")
    List<AttendanceLocationResponse> list(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(required = false) Boolean active) {
        return locations.list(caller, active);
    }

    @GetMapping("/api/attendance/locations/{id}")
    @Operation(summary = "One check-in location")
    AttendanceLocationResponse get(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return locations.get(caller, id);
    }

    @PostMapping("/api/attendance/locations")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a check-in location; every failing field is reported at once")
    AttendanceLocationResponse create(@Parameter(hidden = true) CurrentAccount caller,
            @RequestBody AttendanceLocationRequest request) {
        return locations.create(caller, request);
    }

    @PutMapping("/api/attendance/locations/{id}")
    @Operation(summary = "Change a check-in location; punches already stored are not changed")
    AttendanceLocationResponse update(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id,
            @RequestBody AttendanceLocationRequest request) {
        return locations.update(caller, id, request);
    }

    @PostMapping("/api/attendance/locations/{id}/deactivate")
    @Operation(summary = "Make a check-in location inactive: it no longer counts for new punches")
    AttendanceLocationResponse deactivate(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return locations.deactivate(caller, id);
    }

    @PostMapping("/api/attendance/locations/{id}/reactivate")
    @Operation(summary = "Make a check-in location active again")
    AttendanceLocationResponse reactivate(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        return locations.reactivate(caller, id);
    }

    @GetMapping("/api/attendance/mobile-checkin-settings")
    @Operation(summary = "The rules of mobile check-in in force (the defaults until the company saves its own)")
    MobileCheckinSettingsResponse settings(@Parameter(hidden = true) CurrentAccount caller) {
        return settings.get(caller);
    }

    @PutMapping("/api/attendance/mobile-checkin-settings")
    @Operation(summary = "Save the rules of mobile check-in")
    MobileCheckinSettingsResponse saveSettings(@Parameter(hidden = true) CurrentAccount caller,
            @RequestBody MobileCheckinSettingsRequest request) {
        return settings.update(caller, request);
    }
}
