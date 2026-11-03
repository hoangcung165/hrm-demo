package com.hrmdemo.dto.attendance;

/** @param maxAccuracyMeters 10 to 1,000: a mobile Lần quẹt reported less precise than this is marked Sai số lớn */
public record MobileCheckinSettingsRequest(Integer maxAccuracyMeters) {
}
