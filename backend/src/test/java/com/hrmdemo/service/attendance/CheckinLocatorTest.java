package com.hrmdemo.service.attendance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import java.util.List;
import java.util.UUID;

import com.hrmdemo.service.attendance.CheckinLocator.Found;
import com.hrmdemo.service.attendance.CheckinLocator.Place;
import org.junit.jupiter.api.Test;

/** Where a mobile check-in is against the Địa điểm chấm công: distance, nearest place, Ngoài vùng, Sai số lớn. */
class CheckinLocatorTest {

    /** Trung tâm dữ liệu Hòa Lạc of the example data, 200 m. */
    static final Place HOA_LAC = new Place(UUID.randomUUID(), "Trung tâm dữ liệu Hòa Lạc", 21.0090, 105.5290, 200);
    static final Place HEAD_OFFICE = new Place(UUID.randomUUID(), "Văn phòng chính", 21.0310, 105.7890, 150);
    /** A small place inside the big one, 30 m from its centre. */
    static final Place GATE = new Place(UUID.randomUUID(), "Cổng Hòa Lạc", 21.00927, 105.5290, 50);

    /** About {@code meters} north of a place (one degree of latitude is about 111,195 m). */
    static double north(Place place, double meters) {
        return place.latitude() + meters / 111_195.0;
    }

    @Test
    void theDistanceIsTheGreatCircleDistance() {
        // Hà Nội (Hoàn Kiếm) to TP.HCM (Bến Nghé): about 1,144 km as the crow flies.
        assertThat(CheckinLocator.distanceMeters(21.0285, 105.8542, 10.7769, 106.7009)).isCloseTo(1_144_000,
                within(3_000.0));
        // One degree of longitude on the equator: 2πR / 360.
        assertThat(CheckinLocator.distanceMeters(0, 0, 0, 1)).isCloseTo(111_195, within(1.0));
        assertThat(CheckinLocator.distanceMeters(21.009, 105.529, 21.009, 105.529)).isZero();
        assertThat(CheckinLocator.distanceMeters(HOA_LAC.latitude(), HOA_LAC.longitude(), north(HOA_LAC, 150),
                HOA_LAC.longitude())).isCloseTo(150, within(0.5));
    }

    @Test
    void insideTheRadiusIsANormalPunchWithItsPlaceAndDistance() {
        Found found = CheckinLocator.locate(north(HOA_LAC, 120), HOA_LAC.longitude(), 15, 100,
                List.of(HEAD_OFFICE, HOA_LAC));

        assertThat(found.place()).isEqualTo(HOA_LAC);
        assertThat(found.distanceMeters()).isEqualTo(120);
        assertThat(found.outsideLocation()).isFalse();
        assertThat(found.lowAccuracy()).isFalse();
    }

    @Test
    void theRadiusItselfIsStillInside() {
        assertThat(CheckinLocator.locate(north(HOA_LAC, 199.6), HOA_LAC.longitude(), 5, 100, List.of(HOA_LAC))
                .outsideLocation()).isFalse();
        assertThat(CheckinLocator.locate(north(HOA_LAC, 201), HOA_LAC.longitude(), 5, 100, List.of(HOA_LAC))
                .outsideLocation()).isTrue();
    }

    @Test
    void outsideEveryPlaceIsNgoaiVungWithTheNearestPlaceAndItsDistance() {
        // The example of the design: Out 1.4 km from Hòa Lạc.
        Found found = CheckinLocator.locate(north(HOA_LAC, 1_400), HOA_LAC.longitude(), 20, 100,
                List.of(HEAD_OFFICE, HOA_LAC));

        assertThat(found.place()).isEqualTo(HOA_LAC);
        assertThat(found.distanceMeters()).isEqualTo(1_400);
        assertThat(found.outsideLocation()).isTrue();
    }

    @Test
    void aPlaceThatContainsThePointBeatsANearerOneThatDoesNot() {
        // 45 m north of Hòa Lạc's centre: inside Hòa Lạc (200 m), about 15 m from the gate (50 m) too.
        Found inBoth = CheckinLocator.locate(north(HOA_LAC, 45), HOA_LAC.longitude(), 5, 100, List.of(HOA_LAC, GATE));
        assertThat(inBoth.place()).isEqualTo(GATE);
        assertThat(inBoth.outsideLocation()).isFalse();

        // 150 m north: 120 m from the gate (outside its 50 m) but inside Hòa Lạc, which is farther.
        Found inBigOnly = CheckinLocator.locate(north(HOA_LAC, 150), HOA_LAC.longitude(), 5, 100,
                List.of(GATE, HOA_LAC));
        assertThat(inBigOnly.place()).isEqualTo(HOA_LAC);
        assertThat(inBigOnly.distanceMeters()).isEqualTo(150);
        assertThat(inBigOnly.outsideLocation()).isFalse();
    }

    @Test
    void withoutAnyActivePlaceEveryPunchIsNgoaiVungWithNoPlace() {
        Found found = CheckinLocator.locate(21, 105, 5, 100, List.of());

        assertThat(found.place()).isNull();
        assertThat(found.distanceMeters()).isNull();
        assertThat(found.outsideLocation()).isTrue();
    }

    @Test
    void anAccuracyWorseThanTheMaximumIsSaiSoLonEvenInsideThePlace() {
        assertThat(CheckinLocator.locate(HOA_LAC.latitude(), HOA_LAC.longitude(), 100, 100, List.of(HOA_LAC))
                .lowAccuracy()).isFalse();
        Found found = CheckinLocator.locate(HOA_LAC.latitude(), HOA_LAC.longitude(), 100.5, 100, List.of(HOA_LAC));
        assertThat(found.lowAccuracy()).isTrue();
        assertThat(found.outsideLocation()).isFalse();
    }
}
