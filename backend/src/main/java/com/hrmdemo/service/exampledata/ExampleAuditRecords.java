package com.hrmdemo.service.exampledata;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;
import java.util.Optional;

import com.hrmdemo.entity.audit.AuditAction;
import com.hrmdemo.entity.auth.Account;
import com.hrmdemo.entity.auth.DemoPersona;
import com.hrmdemo.repository.auth.AccountRepository;
import com.hrmdemo.security.CurrentAccount;
import com.hrmdemo.service.approval.ApprovalRequestService;
import com.hrmdemo.service.audit.AuditRecorder;
import com.hrmdemo.service.audit.AuditRegistrations;
import com.hrmdemo.service.resource.ResourceThresholds;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * The example Audit log, so the Admin and Giám đốc personas open a filled screen: over the last week the Giám đốc
 * persona lowered the Bench threshold and lengthened "Sắp hết dự án", the Admin persona lowered the near-full level,
 * and the Giám đốc persona then put the defaults back. Only the records are written: the thresholds in force stay the
 * defaults, which is where the story ends, so the resource screens and their end-to-end flow are unchanged. The
 * seeder calls it once the demo personas exist; a missing persona leaves out its records.
 */
@Component
@ConditionalOnProperty(name = "hrm.example-data.enabled", havingValue = "true")
@RequiredArgsConstructor
class ExampleAuditRecords {

    static final String CHANGED = "Resource thresholds changed";
    static final String RESTORED = "Resource thresholds restored to the defaults";

    private static final ResourceThresholds DEFAULTS = ResourceThresholds.DEFAULTS;
    private static final ResourceThresholds LOWER_BENCH = new ResourceThresholds(40, DEFAULTS.nearFullPercent(), 6);
    private static final ResourceThresholds LOWER_NEAR_FULL = new ResourceThresholds(40, 85, 6);

    private final AuditRecorder audit;
    private final AccountRepository accounts;
    private final Clock clock;

    /** @return how many records were written */
    int seed() {
        Optional<CurrentAccount> director = persona(DemoPersona.DIRECTOR);
        Optional<CurrentAccount> admin = persona(DemoPersona.ADMIN);
        int written = 0;
        written += write(director, 6, LocalTime.of(9, 15), CHANGED, DEFAULTS, LOWER_BENCH);
        written += write(admin, 4, LocalTime.of(14, 30), CHANGED, LOWER_BENCH, LOWER_NEAR_FULL);
        written += write(director, 2, LocalTime.of(10, 5), RESTORED, LOWER_NEAR_FULL, DEFAULTS);
        return written;
    }

    private int write(Optional<CurrentAccount> actor, int daysAgo, LocalTime at, String summary,
            ResourceThresholds before, ResourceThresholds after) {
        if (actor.isEmpty()) {
            return 0;
        }
        LocalDate today = LocalDate.ofInstant(clock.instant(), ApprovalRequestService.COMPANY_ZONE);
        Instant when = today.minusDays(daysAgo).atTime(at).atZone(ApprovalRequestService.COMPANY_ZONE).toInstant();
        audit.recordExampleCompanyWide(when, actor.get(), AuditRegistrations.RESOURCE_SETTING, AuditAction.UPDATE,
                summary, values(before), values(after));
        return 1;
    }

    private Optional<CurrentAccount> persona(DemoPersona persona) {
        return accounts.findByDemoPersona(persona).map(ExampleAuditRecords::signedIn);
    }

    private static CurrentAccount signedIn(Account account) {
        return new CurrentAccount(account.getId(), account.getEmployeeId(), account.roleNames());
    }

    /** The audited fields of the thresholds, as {@code ResourceSettingsService} records them. */
    private static Map<String, Integer> values(ResourceThresholds thresholds) {
        return Map.of("benchPercent", thresholds.benchPercent(), "nearFullPercent", thresholds.nearFullPercent(),
                "endingWeeks", thresholds.endingWeeks());
    }
}
