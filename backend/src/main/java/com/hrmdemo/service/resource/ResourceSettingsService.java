package com.hrmdemo.service.resource;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.hrmdemo.dto.accessscope.Permission;
import com.hrmdemo.dto.resource.ResourceSettingsRequest;
import com.hrmdemo.dto.resource.ResourceSettingsResponse;
import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.resource.ResourceSetting;
import com.hrmdemo.exception.ApiException;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.repository.resource.ResourceSettingRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.accessscope.AccessScope;
import com.hrmdemo.service.accessscope.AccessScopeService;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ngưỡng nguồn lực: the defaults in {@link ResourceThresholds#DEFAULTS} unless the company saved its own. Reading
 * needs {@link Permission#RESOURCE_VIEW}, saving and restoring need {@link Permission#RESOURCE_EDIT}.
 * {@link #current()} is for the other resource services, which have checked the caller themselves.
 */
@Service
@RequiredArgsConstructor
public class ResourceSettingsService {

    private final ResourceSettingRepository settings;
    private final AccountRepository accounts;
    private final AccessScopeService accessScopes;
    private final Clock clock;
    private final AuditRecorder audit;

    /** The thresholds in force now. */
    @Transactional(readOnly = true)
    public ResourceThresholds current() {
        return settings.findFirstBy().map(ResourceSettingsService::thresholds).orElse(ResourceThresholds.DEFAULTS);
    }

    @Transactional(readOnly = true)
    public ResourceSettingsResponse get(CurrentAccount caller) {
        AccessScope scope = accessScopes.scopeOf(caller);
        scope.require(Permission.RESOURCE_VIEW);
        return response(settings.findFirstBy(), scope.has(Permission.RESOURCE_EDIT));
    }

    /**
     * Saves the thresholds. Values equal to the defaults remove the company's own row, so they follow the defaults
     * again.
     */
    @Transactional
    public ResourceSettingsResponse update(CurrentAccount caller, ResourceSettingsRequest request) {
        accessScopes.scopeOf(caller).require(Permission.RESOURCE_EDIT);
        List<Map<String, String>> errors = ResourceThresholds.check(request.benchPercent(), request.nearFullPercent(),
                request.endingWeeks());
        if (!errors.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "validation.invalid", "Request values are invalid")
                    .with("errors", errors);
        }
        ResourceThresholds requested = new ResourceThresholds(request.benchPercent(), request.nearFullPercent(),
                request.endingWeeks());
        Optional<ResourceSetting> existing = settings.findFirstBy();
        ResourceThresholds before = existing.map(ResourceSettingsService::thresholds).orElse(ResourceThresholds.DEFAULTS);
        audit(caller, "Resource thresholds changed", before, requested);
        if (requested.equals(ResourceThresholds.DEFAULTS)) {
            existing.ifPresent(settings::delete);
            return response(Optional.empty(), true);
        }
        ResourceSetting setting = existing.orElse(null);
        if (setting == null) {
            setting = new ResourceSetting(requested.benchPercent(), requested.nearFullPercent(),
                    requested.endingWeeks(), caller.id(), clock.instant());
        } else {
            setting.update(requested.benchPercent(), requested.nearFullPercent(), requested.endingWeeks(),
                    caller.id(), clock.instant());
        }
        return response(Optional.of(settings.save(setting)), true);
    }

    /** "Khôi phục mặc định": removes the company's own thresholds. */
    @Transactional
    public ResourceSettingsResponse restoreDefaults(CurrentAccount caller) {
        accessScopes.scopeOf(caller).require(Permission.RESOURCE_EDIT);
        Optional<ResourceSetting> existing = settings.findFirstBy();
        audit(caller, "Resource thresholds restored to the defaults",
                existing.map(ResourceSettingsService::thresholds).orElse(ResourceThresholds.DEFAULTS),
                ResourceThresholds.DEFAULTS);
        existing.ifPresent(settings::delete);
        return response(Optional.empty(), true);
    }

    /** Audit log record of a change of the thresholds; nothing is written when the values stay the same. */
    private void audit(CurrentAccount caller, String summary, ResourceThresholds before, ResourceThresholds after) {
        audit.recordCompanyWide(caller, AuditRegistrations.RESOURCE_SETTING, AuditAction.UPDATE, summary,
                values(before), values(after));
    }

    private static Map<String, Integer> values(ResourceThresholds thresholds) {
        return Map.of("benchPercent", thresholds.benchPercent(), "nearFullPercent", thresholds.nearFullPercent(),
                "endingWeeks", thresholds.endingWeeks());
    }

    private ResourceSettingsResponse response(Optional<ResourceSetting> setting, boolean canEdit) {
        ResourceThresholds thresholds = setting.map(ResourceSettingsService::thresholds)
                .orElse(ResourceThresholds.DEFAULTS);
        UUID by = setting.map(ResourceSetting::getUpdatedBy).orElse(null);
        String byName = by == null ? null : accounts.findById(by).map(Account::getFullName).orElse(null);
        return new ResourceSettingsResponse(thresholds.benchPercent(), thresholds.nearFullPercent(),
                thresholds.endingWeeks(), setting.isPresent(), setting.map(ResourceSetting::getUpdatedAt).orElse(null),
                byName, canEdit);
    }

    private static ResourceThresholds thresholds(ResourceSetting setting) {
        return new ResourceThresholds(setting.getBenchPercent(), setting.getNearFullPercent(),
                setting.getEndingWeeks());
    }
}
