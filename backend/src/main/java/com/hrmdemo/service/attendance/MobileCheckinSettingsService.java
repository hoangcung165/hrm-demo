package com.hrmdemo.service.attendance;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.attendance.MobileCheckinSettingsRequest;
import com.hrmdemo.dto.attendance.MobileCheckinSettingsResponse;
import com.hrmdemo.entity.attendance.MobileCheckinSetting;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.attendance.MobileCheckinSettingRepository;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The company-wide rules of mobile check-in (HRM-39): the maximum accuracy, 100 m unless the company saved its own.
 * Who may check in (every Employee) and the photo (always required) are fixed. Reading and saving need
 * {@link Permission#ATTENDANCE_LOCATION_EDIT}; {@link #maxAccuracyMeters()} is for the check-in itself.
 */
@Service
@RequiredArgsConstructor
public class MobileCheckinSettingsService {

    public static final int DEFAULT_MAX_ACCURACY_METERS = 100;
    static final int MIN_ACCURACY_METERS = 10;
    static final int MAX_ACCURACY_METERS = 1000;

    private final MobileCheckinSettingRepository settings;
    private final AccountRepository accounts;
    private final AccessScopeService accessScopes;
    private final AuditRecorder audit;
    private final Clock clock;

    /** The maximum accuracy in force now, in metres. */
    @Transactional(readOnly = true)
    public int maxAccuracyMeters() {
        return settings.findFirstBy().map(MobileCheckinSetting::getMaxAccuracyMeters)
                .orElse(DEFAULT_MAX_ACCURACY_METERS);
    }

    @Transactional(readOnly = true)
    public MobileCheckinSettingsResponse get(CurrentAccount caller) {
        accessScopes.scopeOf(caller).require(Permission.ATTENDANCE_LOCATION_EDIT);
        return response(settings.findFirstBy());
    }

    /** Saves the rules; an Audit log record is written only when the value changes. */
    @Transactional
    public MobileCheckinSettingsResponse update(CurrentAccount caller, MobileCheckinSettingsRequest request) {
        accessScopes.scopeOf(caller).require(Permission.ATTENDANCE_LOCATION_EDIT);
        Integer max = request == null ? null : request.maxAccuracyMeters();
        if (max == null || max < MIN_ACCURACY_METERS || max > MAX_ACCURACY_METERS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request values are invalid")
                    .with("errors", List.of(Map.of("field", "maxAccuracyMeters",
                            "code", max == null ? "required" : "out_of_range")));
        }
        Optional<MobileCheckinSetting> existing = settings.findFirstBy();
        int before = existing.map(MobileCheckinSetting::getMaxAccuracyMeters).orElse(DEFAULT_MAX_ACCURACY_METERS);
        audit.recordCompanyWide(caller, AuditRegistrations.MOBILE_CHECKIN_SETTING, AuditAction.UPDATE,
                "Mobile check-in rules changed", Map.of("maxAccuracyMeters", before),
                Map.of("maxAccuracyMeters", max));
        MobileCheckinSetting setting = existing.orElse(null);
        if (setting == null) {
            setting = new MobileCheckinSetting(max, caller.id(), clock.instant());
        } else if (setting.getMaxAccuracyMeters() != max) {
            setting.update(max, caller.id(), clock.instant());
        }
        return response(Optional.of(settings.save(setting)));
    }

    private MobileCheckinSettingsResponse response(Optional<MobileCheckinSetting> setting) {
        String byName = setting.map(MobileCheckinSetting::getUpdatedBy).flatMap(accounts::findById)
                .map(Account::getFullName).orElse(null);
        return new MobileCheckinSettingsResponse(
                setting.map(MobileCheckinSetting::getMaxAccuracyMeters).orElse(DEFAULT_MAX_ACCURACY_METERS),
                DEFAULT_MAX_ACCURACY_METERS, setting.isPresent(),
                setting.map(MobileCheckinSetting::getUpdatedAt).orElse(null), byName, true, true);
    }
}
