package com.hrmdemo.controller.attendance;

import java.util.UUID;

import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.attendance.DailyAttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * The photo of a mobile Lần quẹt (HRM-39): the Employee's own, or within the caller's data scope with ATTENDANCE_VIEW.
 * Every view is audited, so the response is never cached by the browser or a proxy.
 */
@RestController
@RequiredArgsConstructor
public class PunchPhotoController {

    private final DailyAttendanceService daily;

    @GetMapping("/api/attendance/punches/{id}/photo")
    @Operation(summary = "The photo of a mobile check-in; not found outside the caller's sight")
    ResponseEntity<byte[]> photo(@Parameter(hidden = true) CurrentAccount caller, @PathVariable UUID id) {
        DailyAttendanceService.Photo photo = daily.photo(caller, id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .header("X-Content-Type-Options", "nosniff")
                .body(photo.content());
    }
}
