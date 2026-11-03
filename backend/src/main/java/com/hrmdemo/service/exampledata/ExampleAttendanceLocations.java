package com.hrmdemo.service.exampledata;

import java.time.Clock;
import java.util.List;

import com.hrmdemo.entity.attendance.AttendanceLocation;
import com.hrmdemo.repository.attendance.AttendanceLocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * The example Địa điểm chấm công of the {@code #39} artboards: three active places and an old office made inactive.
 * Fictional addresses; the coordinates are only near the streets they name. Added once, when the company has none.
 */
@Component
@ConditionalOnProperty(name = "hrm.example-data.enabled", havingValue = "true")
@RequiredArgsConstructor
class ExampleAttendanceLocations {

    record ExampleLocation(String name, String address, double latitude, double longitude, int radiusMeters,
            boolean active) {
    }

    static final List<ExampleLocation> LOCATIONS = List.of(
            new ExampleLocation("Văn phòng chính", "Tầng 8, 22 Trần Thái Tông, Cầu Giấy, Hà Nội", 21.0310, 105.7890,
                    150, true),
            new ExampleLocation("Văn phòng TP.HCM", "Tầng 5, 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
                    10.7740, 106.7035, 100, true),
            new ExampleLocation("Trung tâm dữ liệu Hòa Lạc", "Khu Công nghệ cao Hòa Lạc, Thạch Thất, Hà Nội",
                    21.0090, 105.5290, 200, true),
            new ExampleLocation("Văn phòng Duy Tân (cũ)", "Tầng 3, 10 Duy Tân, Cầu Giấy, Hà Nội", 21.0305, 105.7830,
                    150, false));

    private final AttendanceLocationRepository locations;
    private final Clock clock;

    /** @return how many places were added (0 when the company already has some) */
    int seed() {
        if (locations.count() > 0) {
            return 0;
        }
        for (ExampleLocation example : LOCATIONS) {
            AttendanceLocation location = new AttendanceLocation(example.name(), example.address(),
                    example.latitude(), example.longitude(), example.radiusMeters(), clock.instant());
            location.setActive(example.active(), clock.instant());
            locations.save(location);
        }
        return LOCATIONS.size();
    }
}
