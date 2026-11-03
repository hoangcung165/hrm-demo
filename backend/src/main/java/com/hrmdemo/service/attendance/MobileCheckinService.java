package com.hrmdemo.service.attendance;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hrmdemo.dto.attendance.MobileCheckinResponse;
import com.hrmdemo.dto.shift.ShiftCalendarResponse.ShiftBrief;
import com.hrmdemo.entity.attendance.AttendanceLocation;
import com.hrmdemo.entity.attendance.MobileCheckinConsent;
import com.hrmdemo.entity.attendance.Punch;
import com.hrmdemo.entity.attendance.PunchPhoto;
import com.hrmdemo.entity.attendance.PunchSource;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.attendance.AttendanceLocationRepository;
import com.hrmdemo.repository.attendance.MobileCheckinConsentRepository;
import com.hrmdemo.repository.attendance.PunchPhotoRepository;
import com.hrmdemo.repository.attendance.PunchRepository;
import com.hrmdemo.repository.employee.EmployeeRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import com.hrmdemo.service.employee.EmployeeAttachmentChecks;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Mobile check-in (HRM-39): any Employee checks in from the phone browser with the position and a front-camera photo,
 * after accepting the notice on location and photo once (Decree 13/2023). The punch is a Lần quẹt at the server's time
 * (the request cannot carry a time), never changed or deleted. Outside every active Địa điểm chấm công, or with an
 * accuracy worse than the company maximum, it is still stored, with the Ngoài vùng or Sai số lớn mark for review.
 * Every check-in and every change of consent is audited; the audit record keeps the place and distance, not the
 * coordinates. Needs no permission: only an Account linked to an active Employee.
 */
@Service
@RequiredArgsConstructor
public class MobileCheckinService {

    /** The wording of the consent notice; raising it asks every Employee to accept again. */
    public static final int NOTICE_VERSION = 1;
    /** A phone that reports worse than this is not giving a position at all. */
    static final double MAX_REPORTED_ACCURACY_METERS = 100_000;

    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};

    private final PunchRepository punches;
    private final PunchPhotoRepository photos;
    private final MobileCheckinConsentRepository consents;
    private final AttendanceLocationRepository locations;
    private final EmployeeRepository employees;
    private final MobileCheckinSettingsService settings;
    private final DailyAttendanceService daily;
    private final AuditRecorder audit;
    private final Clock clock;

    // ----- Consent -----

    @Transactional(readOnly = true)
    public MobileCheckinResponse.Consent consent(CurrentAccount caller) {
        return consentOf(consents.findByEmployeeId(requireEmployee(caller)));
    }

    /** Accepts the notice of {@code noticeVersion}, which must be the current wording. */
    @Transactional
    public MobileCheckinResponse.Consent accept(CurrentAccount caller, Integer noticeVersion) {
        UUID me = requireEmployee(caller);
        if (noticeVersion == null || noticeVersion != NOTICE_VERSION) {
            throw invalid(List.of(error("noticeVersion", noticeVersion == null ? "required" : "outdated")));
        }
        Optional<MobileCheckinConsent> existing = consents.findByEmployeeId(me);
        Map<String, Object> before = existing.map(MobileCheckinService::consentValues).orElse(null);
        MobileCheckinConsent consent = existing.orElse(null);
        Instant now = clock.instant();
        if (consent == null) {
            consent = consents.save(new MobileCheckinConsent(me, NOTICE_VERSION, now));
        } else if (!inForce(consent)) {
            consent.accept(NOTICE_VERSION, now);
        } else {
            return consentOf(Optional.of(consent));
        }
        audit.record(caller, AuditRegistrations.MOBILE_CHECKIN_CONSENT, consent.getId(),
                before == null ? AuditAction.CREATE : AuditAction.UPDATE, "Mobile check-in consent accepted", before,
                consentValues(consent));
        return consentOf(Optional.of(consent));
    }

    /** Withdraws the consent: mobile check-in is unavailable until it is accepted again. */
    @Transactional
    public MobileCheckinResponse.Consent withdraw(CurrentAccount caller) {
        UUID me = requireEmployee(caller);
        Optional<MobileCheckinConsent> existing = consents.findByEmployeeId(me);
        if (existing.isPresent() && existing.get().isAccepted()) {
            MobileCheckinConsent consent = existing.get();
            Map<String, Object> before = consentValues(consent);
            consent.withdraw(clock.instant());
            audit.record(caller, AuditRegistrations.MOBILE_CHECKIN_CONSENT, consent.getId(), AuditAction.UPDATE,
                    "Mobile check-in consent withdrawn", before, consentValues(consent));
        }
        return consentOf(existing);
    }

    // ----- Today's card and the location chip -----

    /** The Chấm công hôm nay card of the caller. */
    @Transactional(readOnly = true)
    public MobileCheckinResponse.Today today(CurrentAccount caller) {
        UUID me = requireEmployee(caller);
        ZoneId zone = PunchImportService.COMPANY_ZONE;
        Instant now = clock.instant();
        LocalDate today = now.atZone(zone).toLocalDate();
        Duration before = AttendanceProcessor.Rules.DEFAULT.marginBefore();
        Duration after = AttendanceProcessor.Rules.DEFAULT.marginAfter();

        LocalDate date = today;
        ShiftBrief shift = daily.dayOf(me, today.minusDays(1), null).map(DailyAttendanceService.DayOf::shift)
                .filter(ShiftBrief::crossesMidnight)
                .filter(night -> now.isBefore(today.atTime(night.endTime()).atZone(zone).toInstant().plus(after)))
                .orElse(null);
        if (shift != null) {
            date = today.minusDays(1);
        } else {
            shift = daily.dayOf(me, today, null).map(DailyAttendanceService.DayOf::shift).orElse(null);
        }
        Instant from;
        Instant to;
        if (shift == null) {
            from = today.atStartOfDay(zone).toInstant();
            to = today.plusDays(1).atStartOfDay(zone).toInstant();
        } else {
            from = date.atTime(shift.startTime()).atZone(zone).toInstant().minus(before);
            to = date.plusDays(shift.crossesMidnight() ? 1 : 0).atTime(shift.endTime()).atZone(zone).toInstant()
                    .plus(after);
        }
        List<Punch> found = punches.findByEmployeeIdAndPunchedAtGreaterThanEqualAndPunchedAtLessThanOrderByPunchedAt(
                me, from, to);
        Map<UUID, AttendanceLocation> placeOf = locations.findAllById(found.stream().map(Punch::getLocationId)
                .filter(java.util.Objects::nonNull).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(AttendanceLocation::getId, Function.identity()));
        List<MobileCheckinResponse.Punch> lines = found.stream().map(punch -> line(punch,
                placeOf.get(punch.getLocationId()))).toList();
        return new MobileCheckinResponse.Today(date, consentOf(consents.findByEmployeeId(me)), shift, lines,
                lines.isEmpty() ? "IN" : "OUT", settings.maxAccuracyMeters());
    }

    /** Where a position is against the active places; nothing is stored. Needs the consent in force. */
    @Transactional(readOnly = true)
    public MobileCheckinResponse.Located locate(CurrentAccount caller, Double latitude, Double longitude,
            Double accuracyMeters) {
        UUID me = requireEmployee(caller);
        requireConsent(me);
        List<Map<String, String>> errors = new ArrayList<>();
        checkPosition(latitude, longitude, accuracyMeters, errors);
        if (!errors.isEmpty()) {
            throw invalid(errors);
        }
        int max = settings.maxAccuracyMeters();
        CheckinLocator.Found found = CheckinLocator.locate(latitude, longitude, accuracyMeters, max, activePlaces());
        return new MobileCheckinResponse.Located(place(found.place()), found.distanceMeters(),
                found.outsideLocation(), found.lowAccuracy(), accuracyMeters, max);
    }

    // ----- Check-in -----

    /**
     * Stores one mobile Lần quẹt at the server's time with its photo. Refused, storing nothing, without an active
     * Employee, without the consent, or without a valid photo and position.
     *
     * @param photo the front-camera photo, JPEG or PNG (checked by its content), up to 5 MiB
     */
    @Transactional
    public MobileCheckinResponse.Punch checkIn(CurrentAccount caller, byte[] photo, Double latitude,
            Double longitude, Double accuracyMeters) {
        UUID me = requireEmployee(caller);
        requireConsent(me);
        List<Map<String, String>> errors = new ArrayList<>();
        String contentType = photoType(photo, errors);
        checkPosition(latitude, longitude, accuracyMeters, errors);
        if (!errors.isEmpty()) {
            throw invalid(errors);
        }
        Instant at = clock.instant().truncatedTo(ChronoUnit.SECONDS);
        if (punches.existsByEmployeeIdAndPunchedAt(me, at)) {
            throw new ApiException(HttpStatus.CONFLICT, "mobile_checkin.duplicate",
                    "A punch at this second is already stored");
        }
        int max = settings.maxAccuracyMeters();
        CheckinLocator.Found found = CheckinLocator.locate(latitude, longitude, accuracyMeters, max, activePlaces());
        Punch punch = punches.save(Punch.mobile(me, at, latitude, longitude, accuracyMeters,
                found.place() == null ? null : found.place().id(), found.distanceMeters(), found.outsideLocation(),
                found.lowAccuracy()));
        photos.save(new PunchPhoto(punch.getId(), contentType, photo, sha256(photo), at));

        Map<String, Object> values = new LinkedHashMap<>();
        values.put("punchedAt", at.toString());
        values.put("location", found.place() == null ? null : found.place().name());
        values.put("distanceMeters", found.distanceMeters());
        values.put("accuracyMeters", accuracyMeters);
        values.put("outsideLocation", found.outsideLocation());
        values.put("lowAccuracy", found.lowAccuracy());
        audit.record(caller, AuditRegistrations.MOBILE_CHECKIN, punch.getId(), AuditAction.CREATE, "Mobile check-in",
                null, values);
        return line(punch, found.place() == null ? null : locations.findById(found.place().id()).orElse(null));
    }

    // ----- helpers -----

    private UUID requireEmployee(CurrentAccount caller) {
        if (caller.employeeId() == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "mobile_checkin.no_employee",
                    "Only an Account linked to an Employee checks in");
        }
        boolean active = employees.findById(caller.employeeId()).map(e -> e.isActive()).orElse(false);
        if (!active) {
            throw new ApiException(HttpStatus.FORBIDDEN, "mobile_checkin.employee_inactive",
                    "The Employee is not active");
        }
        return caller.employeeId();
    }

    private void requireConsent(UUID me) {
        if (!consents.findByEmployeeId(me).map(MobileCheckinService::inForce).orElse(false)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "mobile_checkin.consent_required",
                    "The notice on location and photo must be accepted first")
                    .with("noticeVersion", NOTICE_VERSION);
        }
    }

    private static boolean inForce(MobileCheckinConsent consent) {
        return consent.isAccepted() && consent.getNoticeVersion() >= NOTICE_VERSION;
    }

    private List<CheckinLocator.Place> activePlaces() {
        return locations.findAllByActiveOrderByNameAsc(true).stream()
                .map(l -> new CheckinLocator.Place(l.getId(), l.getName(), l.getLatitude(), l.getLongitude(),
                        l.getRadiusMeters()))
                .toList();
    }

    static void checkPosition(Double latitude, Double longitude, Double accuracy, List<Map<String, String>> errors) {
        range("latitude", latitude, -90, 90, errors);
        range("longitude", longitude, -180, 180, errors);
        range("accuracyMeters", accuracy, 0, MAX_REPORTED_ACCURACY_METERS, errors);
    }

    private static void range(String field, Double value, double min, double max, List<Map<String, String>> errors) {
        if (value == null) {
            errors.add(error(field, "required"));
        } else if (value.isNaN() || value < min || value > max) {
            errors.add(error(field, "out_of_range"));
        }
    }

    /** The photo's type from its first bytes; adds an error and returns null when it is missing or not an image. */
    static String photoType(byte[] photo, List<Map<String, String>> errors) {
        if (photo == null || photo.length == 0) {
            errors.add(error("photo", "required"));
            return null;
        }
        if (photo.length > EmployeeAttachmentChecks.MAX_BYTES) {
            errors.add(error("photo", "too_large"));
            return null;
        }
        if (starts(photo, JPEG)) {
            return "image/jpeg";
        }
        if (starts(photo, PNG)) {
            return "image/png";
        }
        errors.add(error("photo", "unsupported"));
        return null;
    }

    private static boolean starts(byte[] bytes, byte[] signature) {
        return bytes.length >= signature.length
                && Arrays.equals(bytes, 0, signature.length, signature, 0, signature.length);
    }

    private static MobileCheckinResponse.Consent consentOf(Optional<MobileCheckinConsent> consent) {
        return consent.map(c -> new MobileCheckinResponse.Consent(inForce(c), c.getAcceptedAt(), c.getWithdrawnAt(),
                c.getNoticeVersion(), NOTICE_VERSION))
                .orElse(new MobileCheckinResponse.Consent(false, null, null, null, NOTICE_VERSION));
    }

    private static Map<String, Object> consentValues(MobileCheckinConsent consent) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("accepted", consent.isAccepted());
        values.put("noticeVersion", consent.getNoticeVersion());
        values.put("acceptedAt", consent.getAcceptedAt().toString());
        return values;
    }

    private static MobileCheckinResponse.Place place(CheckinLocator.Place place) {
        return place == null ? null : new MobileCheckinResponse.Place(place.id(), place.name(), place.radiusMeters());
    }

    private static MobileCheckinResponse.Punch line(Punch punch, AttendanceLocation place) {
        boolean mobile = punch.getSource() == PunchSource.MOBILE;
        return new MobileCheckinResponse.Punch(punch.getId(),
                punch.getPunchedAt().atZone(PunchImportService.COMPANY_ZONE).toOffsetDateTime(),
                punch.getSource().name(),
                place == null ? null : new MobileCheckinResponse.Place(place.getId(), place.getName(),
                        place.getRadiusMeters()),
                punch.getDistanceMeters(), punch.getAccuracyMeters(), punch.isOutsideLocation(),
                punch.isLowAccuracy(), mobile);
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Map<String, String> error(String field, String code) {
        return Map.of("field", field, "code", code);
    }

    private static ApiException invalid(List<Map<String, String>> errors) {
        return new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request values are invalid")
                .with("errors", errors);
    }
}
