package com.hrmdemo.dto.attendance;

/**
 * A Địa điểm chấm công to add or save.
 *
 * @param name 1 to 100 characters, unique in the company (case ignored, inactive places included)
 * @param address up to 255 characters; optional
 * @param latitude -90 to 90, decimal degrees (WGS 84, as the phone reports)
 * @param longitude -180 to 180, decimal degrees
 * @param radiusMeters 50 to 1,000
 */
public record AttendanceLocationRequest(String name, String address, Double latitude, Double longitude,
        Integer radiusMeters) {
}
