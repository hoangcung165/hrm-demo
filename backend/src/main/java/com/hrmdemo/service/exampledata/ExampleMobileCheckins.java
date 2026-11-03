package com.hrmdemo.service.exampledata;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.config.CurrentLegalEntity;
import com.hrmdemo.entity.attendance.AttendanceLocation;
import com.hrmdemo.entity.attendance.MobileCheckinConsent;
import com.hrmdemo.entity.attendance.Punch;
import com.hrmdemo.entity.attendance.PunchPhoto;
import com.hrmdemo.entity.shift.RoundingMode;
import com.hrmdemo.entity.shift.Shift;
import com.hrmdemo.entity.shift.ShiftPattern;
import com.hrmdemo.repository.attendance.AttendanceLocationRepository;
import com.hrmdemo.repository.attendance.MobileCheckinConsentRepository;
import com.hrmdemo.repository.attendance.PunchPhotoRepository;
import com.hrmdemo.repository.attendance.PunchRepository;
import com.hrmdemo.repository.shift.ShiftRepository;
import com.hrmdemo.service.attendance.CheckinLocator;
import com.hrmdemo.service.attendance.MobileCheckinService;
import com.hrmdemo.service.attendance.MobileCheckinSettingsService;
import com.hrmdemo.service.attendance.PunchImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * The example mobile check-ins of the {@code #39} artboards: Lưu Đức Mạnh works the night shift at the data centre
 * three days ago; he checks in by phone at Trung tâm dữ liệu Hòa Lạc and checks out by phone 1.4 km away, so that day
 * is Ngoài vùng. Dated relative to today so the day stays in the default views. The photos are a plain placeholder
 * image, never a face. Needs the example places ({@link ExampleAttendanceLocations}); added once.
 */
@Component
@ConditionalOnProperty(name = "hrm.example-data.enabled", havingValue = "true")
@RequiredArgsConstructor
class ExampleMobileCheckins {

    static final String PERSON = "Lưu Đức Mạnh";
    static final String SHIFT_CODE = "DEM-DC";
    static final String PLACE = "Trung tâm dữ liệu Hòa Lạc";
    static final int DAYS_AGO = 3;
    /** A 48 × 48 PNG: a soft grey placeholder for a check-in photo. */
    static final byte[] PHOTO = Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAABq0lEQVR42s3Ox1JC"
            + "QRCF4fPY5hwxkESy5JxBMGPOceUD+CRaNZsu9ELPjHCn6tt1VZ8fY464UTC+kTAKJjaTRsHkVsoomNpOGwXTzoxRMOPKGgWz7pxRMOfJGwXz3oJR"
            + "sLBTVPb6+WVF+ScWfSUFfVIohc9Y2i3LYtYIss+x7K9IkaoRpP5jJVDlU6gR+BNYDdb4lIP4E1gL1ZmUawTmCtbDDSbNIOYKHJEmk2YQcwUb0RaT"
            + "ZhBzBZt7+0yaQcwVbMXaTJpBzBVsxztMmkHMFTgTB0yaQcwVuJKHTJpBzBW4U0d8yjX8CXjSx3zKQfwJeDMnUhRqpP5jJ3sqS6pG9jl8uTMFzBqF"
            + "z9jNd9XUux99Un6uam/hL5xL+VmSJfUfgeIFk0IKxVxBsHQ5kGYKNXALofJVf/9YI/SfQ7hybeXfUyirUUSqN1aGGmQ1imjt9k9DrRH+3MVe/e63"
            + "EdQIv6cRa9z3GFmN0LOOePOhx4iDetaRaD1SI64RaACS+0+ULUE0AKn2M2VLEA1AuvNC2RJEA5A5eKVsCaIByB6+UbYE0QDkjt4pW4JowDdZe3G7"
            + "RqnNFwAAAABJRU5ErkJggg==");

    private final ShiftRepository shifts;
    private final AttendanceLocationRepository locations;
    private final PunchRepository punches;
    private final PunchPhotoRepository photos;
    private final MobileCheckinConsentRepository consents;
    private final CurrentLegalEntity legalEntity;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    /** @return how many punches were added (0 when the person or the place is missing, or the shift exists) */
    int seed(Map<String, UUID> employeeIdByName) {
        UUID person = employeeIdByName.get(PERSON);
        Optional<AttendanceLocation> place = locations.findAllByActiveOrderByNameAsc(true).stream()
                .filter(l -> l.getName().equals(PLACE)).findFirst();
        if (person == null || place.isEmpty() || shifts.existsByCodeIgnoreCase(SHIFT_CODE)) {
            return 0;
        }
        ZoneId zone = PunchImportService.COMPANY_ZONE;
        LocalDate day = LocalDate.now(clock.withZone(zone)).minusDays(DAYS_AGO);
        Shift night = shifts.save(new Shift(SHIFT_CODE, new ShiftPattern("Ca đêm trung tâm dữ liệu",
                LocalTime.of(22, 0), LocalTime.of(6, 0), null, null, 10, 10, RoundingMode.NONE, null),
                clock.instant()));
        jdbc.update("""
                insert into shift_assignment (id, legal_entity_id, employee_id, work_date, shift_id, created_at,
                    updated_at)
                values (?, ?, ?, ?, ?, now(), now())""", UUID.randomUUID(), legalEntity.id(), person, day,
                night.getId());
        consents.save(new MobileCheckinConsent(person, MobileCheckinService.NOTICE_VERSION,
                day.minusDays(7).atTime(9, 0).atZone(zone).toInstant()));

        AttendanceLocation hoaLac = place.get();
        // In: 21:54 at the gate, 60 m from the centre. Out: 06:07 the next morning, 1.4 km north (a café).
        punch(person, day.atTime(21, 54, 12).atZone(zone).toInstant(), hoaLac, 60, 14);
        punch(person, day.plusDays(1).atTime(6, 7, 40).atZone(zone).toInstant(), hoaLac, 1_400, 22);
        return 2;
    }

    private void punch(UUID person, java.time.Instant at, AttendanceLocation place, int metersNorth,
            double accuracy) {
        double latitude = place.getLatitude() + metersNorth / 111_195.0;
        CheckinLocator.Found found = CheckinLocator.locate(latitude, place.getLongitude(), accuracy,
                MobileCheckinSettingsService.DEFAULT_MAX_ACCURACY_METERS,
                java.util.List.of(new CheckinLocator.Place(place.getId(), place.getName(), place.getLatitude(),
                        place.getLongitude(), place.getRadiusMeters())));
        Punch saved = punches.save(Punch.mobile(person, at, latitude, place.getLongitude(), accuracy, place.getId(),
                found.distanceMeters(), found.outsideLocation(), found.lowAccuracy()));
        photos.save(new PunchPhoto(saved.getId(), "image/png", PHOTO, sha256(PHOTO), at));
    }

    private static String sha256(byte[] content) {
        try {
            return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                    .digest(content));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
