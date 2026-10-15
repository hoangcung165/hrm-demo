package com.hrmdemo.service.audit;

import static com.hrmdemo.service.audit.AuditedType.field;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Which records are audited. To audit a new kind of record, add a bean here and call
 * {@link AuditRecorder#record} where the record changes; the steps, including the screen labels, are in
 * {@code docs/agents/audit-log.md}. Salary profiles and contracts follow with HRM-10 (ADR 0004: every change of a Hồ sơ
 * lương is audited), the work history with HRM-11.
 */
@Configuration(proxyBeanMethods = false)
public class AuditRegistrations {

    /** Ngưỡng nguồn lực: one record per Pháp nhân, so its id is the Legal entity id. */
    public static final String RESOURCE_SETTING = "RESOURCE_SETTING";

    @Bean
    AuditedType resourceSettingAudit() {
        return new AuditedType(RESOURCE_SETTING, "Resource thresholds",
                List.of(field("benchPercent"), field("nearFullPercent"), field("endingWeeks")));
    }
}
