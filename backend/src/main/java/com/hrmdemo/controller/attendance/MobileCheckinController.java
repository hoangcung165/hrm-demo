package com.hrmdemo.controller.attendance;

import java.io.IOException;

import com.hrmdemo.dto.attendance.MobileCheckinResponse;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.attendance.MobileCheckinService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Mobile check-in of the caller (HRM-39). Any Account linked to an active Employee; no permission. The punch time is
 * always the server's: no parameter carries a time.
 */
@RestController
@RequiredArgsConstructor
public class MobileCheckinController {

    private final MobileCheckinService checkins;

    /** @param noticeVersion the wording of the notice the phone showed */
    record ConsentRequest(Integer noticeVersion) {
    }

    @GetMapping("/api/attendance/mobile-checkin")
    @Operation(summary = "The Chấm công hôm nay card: the work day, its shift, its punches, the consent")
    MobileCheckinResponse.Today today(@Parameter(hidden = true) CurrentAccount caller) {
        return checkins.today(caller);
    }

    @GetMapping("/api/attendance/mobile-checkin/locate")
    @Operation(summary = "Where a position is against the active check-in locations; nothing is stored")
    MobileCheckinResponse.Located locate(@Parameter(hidden = true) CurrentAccount caller,
            @RequestParam(required = false) Double latitude, @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) Double accuracyMeters) {
        return checkins.locate(caller, latitude, longitude, accuracyMeters);
    }

    @PostMapping(path = "/api/attendance/mobile-checkin", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Check in from the phone: a Lần quẹt at the server's time with the position and a photo")
    MobileCheckinResponse.Punch checkIn(@Parameter(hidden = true) CurrentAccount caller,
            @RequestPart(name = "photo", required = false) MultipartFile photo,
            @RequestParam(required = false) Double latitude, @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) Double accuracyMeters) {
        byte[] bytes;
        try {
            bytes = photo == null ? null : photo.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "attachment.file_invalid", "Cannot read file");
        }
        return checkins.checkIn(caller, bytes, latitude, longitude, accuracyMeters);
    }

    @GetMapping("/api/attendance/mobile-checkin/consent")
    @Operation(summary = "The caller's consent to the notice on location and photo")
    MobileCheckinResponse.Consent consent(@Parameter(hidden = true) CurrentAccount caller) {
        return checkins.consent(caller);
    }

    @PostMapping("/api/attendance/mobile-checkin/consent")
    @Operation(summary = "Accept the notice on location and photo (asked once before the first check-in)")
    MobileCheckinResponse.Consent accept(@Parameter(hidden = true) CurrentAccount caller,
            @RequestBody(required = false) ConsentRequest request) {
        return checkins.accept(caller, request == null ? null : request.noticeVersion());
    }

    @DeleteMapping("/api/attendance/mobile-checkin/consent")
    @Operation(summary = "Withdraw the consent: mobile check-in is unavailable until it is accepted again")
    MobileCheckinResponse.Consent withdraw(@Parameter(hidden = true) CurrentAccount caller) {
        return checkins.withdraw(caller);
    }
}
