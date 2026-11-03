package com.hrmdemo.dto.attendance;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.hrmdemo.dto.shift.ShiftCalendarResponse.ShiftBrief;
import io.swagger.v3.oas.annotations.media.Schema;

/** What the phone shows for mobile check-in (HRM-39): the Chấm công hôm nay card, the location chip, a punch. */
public final class MobileCheckinResponse {

    private MobileCheckinResponse() {
    }

    /**
     * The caller's consent to the notice on location and photo.
     *
     * @param accepted in force: accepted, not withdrawn, and of the current wording
     * @param acceptedAt the latest acceptance; null when never accepted
     * @param withdrawnAt when it was withdrawn; null while in force or never accepted
     * @param noticeVersion the wording accepted; null when never accepted
     * @param currentNoticeVersion the wording the phone must show
     */
    public record Consent(boolean accepted, @Schema(nullable = true) Instant acceptedAt,
            @Schema(nullable = true) Instant withdrawnAt, @Schema(nullable = true) Integer noticeVersion,
            int currentNoticeVersion) {
    }

    /** A Địa điểm chấm công as the phone shows it. */
    public record Place(UUID id, String name, int radiusMeters) {
    }

    /**
     * Where a position is, against the active places: the location chip of the camera step. Nothing is stored.
     *
     * @param location the place recorded (the nearest that contains the point, else the nearest); null with none
     * @param distanceMeters to {@code location}; null with none
     */
    public record Located(@Schema(nullable = true) Place location, @Schema(nullable = true) Integer distanceMeters,
            boolean outsideLocation, boolean lowAccuracy, double accuracyMeters, int maxAccuracyMeters) {
    }

    /**
     * One Lần quẹt of the caller. A machine punch has no location, distance or accuracy.
     *
     * @param source MACHINE or MOBILE
     * @param hasPhoto a mobile punch always has one
     */
    public record Punch(UUID id, OffsetDateTime at, String source, @Schema(nullable = true) Place location,
            @Schema(nullable = true) Integer distanceMeters, @Schema(nullable = true) Double accuracyMeters,
            boolean outsideLocation, boolean lowAccuracy, boolean hasPhoto) {
    }

    /**
     * The Chấm công hôm nay card.
     *
     * @param date the work day the card is about: today, or yesterday while the Khung ca of yesterday's night shift is
     *        still open
     * @param shift that day's Ca làm việc; null when it has none
     * @param punches the caller's punches of that day's Khung ca (of the calendar day without a shift), oldest first
     * @param nextLabel IN or OUT, the label of the button only: the Bộ xử lý chấm công still decides In and Out
     */
    public record Today(LocalDate date, Consent consent, @Schema(nullable = true) ShiftBrief shift,
            List<Punch> punches, String nextLabel, int maxAccuracyMeters) {
    }
}
